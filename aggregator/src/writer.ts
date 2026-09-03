/**
 * Writing finished candles to MongoDB.
 * Finished candles are buffered per collection and flushed on a timer rather
 * than written one at a time: at every aligned boundary the entire universe
 * closes a bucket at once, and eight thousand individual writes arriving in the
 * same tick is what the buffering exists to avoid.
 * Every write is an upsert keyed on `{ tickerID, timestamp }`. That is what
 * makes a restart safe — a bucket rebuilt from a replayed trade overwrites its
 * own row instead of adding a second one — and it is why this never inserts.
 */
import { Counter, Histogram } from 'prom-client';
import { AGGREGATOR_TO_CHART, OHLCV_COLLECTIONS, type AggregatorTimeframe } from '@ereuna/shared';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';

export type CandleDoc = {
    tickerID: string;
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

const written = new Counter({
    name: 'aggregator_candles_written_total',
    help: 'Candles upserted into MongoDB',
    labelNames: ['collection'],
});

const writeFailures = new Counter({
    name: 'aggregator_candle_write_failures_total',
    help: 'Candles that could not be written to MongoDB',
    labelNames: ['collection'],
});

const writeDuration = new Histogram({
    name: 'aggregator_write_duration_seconds',
    help: 'Time taken by one bulk write',
    labelNames: ['collection'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

const pending = new Map<string, CandleDoc[]>();

let timer: NodeJS.Timeout | undefined;

/** Queue a finished candle. It reaches Mongo on the next flush, not now. */
export function enqueue(timeframe: AggregatorTimeframe, doc: CandleDoc): void {
    const collection = collectionFor(timeframe);
    const batch = pending.get(collection);
    if (batch === undefined) pending.set(collection, [doc]);
    else batch.push(doc);
}

export function startWriter(): void {
    timer ??= setInterval(() => void flush(), config.candles.flushIntervalMs);
}

/** Stop flushing on a timer and write whatever is still buffered. */
export async function stopWriter(): Promise<void> {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
    await flush();
}

export function pendingWrites(): number {
    let total = 0;
    for (const batch of pending.values()) total += batch.length;
    return total;
}

/** Write everything buffered. Collections are independent, so they go in parallel. */
export async function flush(): Promise<void> {
    const batches = [...pending.entries()].filter(([, docs]) => docs.length > 0);
    if (batches.length === 0) return;
    pending.clear();

    await Promise.all(batches.map(([collection, docs]) => write(collection, docs)));
}

async function write(collection: string, docs: CandleDoc[]): Promise<void> {
    for (let index = 0; index < docs.length; index += config.candles.writeBatchSize) {
        const chunk = docs.slice(index, index + config.candles.writeBatchSize);
        const done = writeDuration.startTimer({ collection });

        try {
            await getDb()
                .collection(collection)
                .bulkWrite(
                    chunk.map((doc) => ({
                        updateOne: {
                            filter: { tickerID: doc.tickerID, timestamp: doc.timestamp },
                            update: { $set: doc },
                            upsert: true,
                        },
                    })),
                    // Unordered: one rejected document must not abandon the rest
                    // of a batch that has nothing to do with it.
                    { ordered: false },
                );
            written.inc({ collection }, chunk.length);
        } catch (err) {
            // Not retried and not re-queued. A candle is worth a fraction of a
            // second of history, the next bucket is already being built, and a
            // retry queue that grows during a Mongo outage is how a service
            // that was merely degraded runs out of memory.
            writeFailures.inc({ collection }, chunk.length);
            logger.error({ err, collection, candles: chunk.length }, 'Candle bulk write failed');
        } finally {
            done();
        }
    }
}

function collectionFor(timeframe: AggregatorTimeframe): string {
    return OHLCV_COLLECTIONS[AGGREGATOR_TO_CHART[timeframe]];
}
