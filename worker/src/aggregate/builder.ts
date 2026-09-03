/**
 * The candle state machine: trades in, candles out.
 * One open bucket per (timeframe, symbol) is held in memory, updated by every
 * trade that falls inside it, and finalised when its end passes. All seven
 * timeframes run the same code path — the only thing that differs between a
 * one-minute bar and a weekly one is where `buckets.ts` puts the boundary.
 * A closed bucket is swept on a timer rather than on the next trade for the
 * same symbol. A thinly traded name might not print again for an hour, and
 * closing its bar only when it does would leave the last candle of the day
 * sitting in memory until the market shut.
 * OHLC relationships are not re-validated on the way out. `high` and `low` are
 * only ever moved by `Math.max`/`Math.min` against a price that was checked for
 * finiteness when the trade was parsed, so a bar that violates them cannot be
 * constructed here.
 */
import { Gauge } from 'prom-client';
import { AGGREGATOR_TIMEFRAMES, type AggregateMessage, type AggregatorTimeframe } from '@ereuna/shared';
import { bucketEnd, bucketStart } from '@/aggregate/buckets.js';
import { publishCandle } from '@/aggregate/publisher.js';
import { enqueue, type CandleDoc } from '@/aggregate/writer.js';
import { config } from '@/lib/config.js';

type OpenBucket = {
    start: number;
    end: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number; // depending what Tiingo plan you have
    publishedAt: number;
};

const openBuckets = new Gauge({
    name: 'aggregator_open_buckets',
    help: 'Candles currently being built, by timeframe',
    labelNames: ['timeframe'],
});

/** One map per timeframe, symbol → the bucket currently being built. */
const state = new Map<AggregatorTimeframe, Map<string, OpenBucket>>(
    AGGREGATOR_TIMEFRAMES.map((timeframe) => [timeframe, new Map<string, OpenBucket>()]),
);

/**
 * Apply one trade to every timeframe.
 * A trade that lands outside the open bucket closes it first: that is the
 * normal path for a bucket boundary crossed by a symbol that is still trading,
 * and it is why the sweep only ever has quiet symbols left to deal with.
 */
export function applyTrade(symbol: string, price: number, at: number, now: number = Date.now()): void {
    for (const timeframe of AGGREGATOR_TIMEFRAMES) {
        const buckets = bucketsFor(timeframe);
        const open = buckets.get(symbol);
        const start = bucketStart(timeframe, at);

        if (open === undefined || open.start !== start) {
            if (open !== undefined) close(timeframe, symbol, open);
            buckets.set(symbol, {
                start,
                end: bucketEnd(timeframe, at),
                open: price,
                high: price,
                low: price,
                close: price,
                publishedAt: 0,
            });
        } else {
            open.high = Math.max(open.high, price);
            open.low = Math.min(open.low, price);
            open.close = price;
        }

        publishInProgress(timeframe, symbol, now);
    }
}

/** Finalise every bucket whose end has passed. */
export function sweep(now: number = Date.now()): void {
    for (const timeframe of AGGREGATOR_TIMEFRAMES) {
        const buckets = bucketsFor(timeframe);
        for (const [symbol, bucket] of buckets) {
            if (now < bucket.end) continue;
            close(timeframe, symbol, bucket);
            buckets.delete(symbol);
        }
        openBuckets.set({ timeframe }, buckets.size);
    }
}

/**
 * Finalise everything, whatever its end says.
 * Called at the closing bell. A daily bucket does not end until UTC midnight
 * and a weekly one not until Monday, so without this the day's daily and weekly
 * bars would only be written hours later — or, for the weekly, days later.
 */
export function closeSession(): void {
    for (const timeframe of AGGREGATOR_TIMEFRAMES) {
        const buckets = bucketsFor(timeframe);
        for (const [symbol, bucket] of buckets) close(timeframe, symbol, bucket);
        buckets.clear();
        openBuckets.set({ timeframe }, 0);
    }
}

/**
 * Restore a week-to-date bar so a session that is not the week's first one
 * continues it. Without this the weekly bar's open would become Tuesday's open
 * and its range would lose Monday, because the closing bell clears the bucket
 * every day while the week runs to Friday.
 */
export function seedWeekly(bars: readonly CandleDoc[]): void {
    const buckets = bucketsFor('1w');
    for (const bar of bars) {
        const start = bar.timestamp.getTime();
        buckets.set(bar.tickerID, {
            start,
            end: bucketEnd('1w', start),
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            publishedAt: 0,
        });
    }
    openBuckets.set({ timeframe: '1w' }, buckets.size);
}

/** How many buckets are open across every timeframe, for logging. */
export function openBucketCount(): number {
    let total = 0;
    for (const buckets of state.values()) total += buckets.size;
    return total;
}

/** Write and publish a bucket as closed. Does not remove it — the caller owns the map. */
function close(timeframe: AggregatorTimeframe, symbol: string, bucket: OpenBucket): void {
    const doc = toDoc(symbol, bucket);
    enqueue(timeframe, doc);
    publishCandle(toMessage(timeframe, doc, true));
}

/**
 * Republish the bucket as it currently stands, at most once per throttle window.
 * A liquid symbol prints many times a second and every print moves the same
 * bar, so without the floor the feed is mostly redundant updates.
 */
function publishInProgress(timeframe: AggregatorTimeframe, symbol: string, now: number): void {
    const bucket = bucketsFor(timeframe).get(symbol);
    if (bucket === undefined || now - bucket.publishedAt < config.candles.publishThrottleMs) return;
    bucket.publishedAt = now;
    publishCandle(toMessage(timeframe, toDoc(symbol, bucket), false));
}

function toDoc(symbol: string, bucket: OpenBucket): CandleDoc {
    return {
        tickerID: symbol,
        timestamp: new Date(bucket.start),
        open: bucket.open,
        high: bucket.high,
        low: bucket.low,
        close: bucket.close,
        volume: bucket.volume ?? 0
    };
}

function toMessage(timeframe: AggregatorTimeframe, doc: CandleDoc, final: boolean): AggregateMessage {
    return {
        tickerID: doc.tickerID,
        timeframe,
        timestamp: doc.timestamp.toISOString(),
        open: doc.open,
        high: doc.high,
        low: doc.low,
        close: doc.close,
        volume: doc.volume,
        final,
    };
}

function bucketsFor(timeframe: AggregatorTimeframe): Map<string, OpenBucket> {
    const buckets = state.get(timeframe);
    if (buckets === undefined) throw new Error(`No bucket map for timeframe ${timeframe}`);
    return buckets;
}
