import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { register } from 'prom-client';
import { OHLCV_COLLECTIONS, type AggregatorTimeframe } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import type { CandleDoc } from '@/aggregate/writer.js';

const db: { current: DbStub } = { current: fakeDb() };
const logged: { errors: unknown[] } = { errors: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/logger.js', () => ({
    logger: {
        error: (payload: unknown): void => {
            logged.errors.push(payload);
        },
        info: (): void => {},
        warn: (): void => {},
        debug: (): void => {},
    },
}));

const { config } = await import('@/lib/config.js');

/**
 * The buffer is module state, and prom-client's registry rejects a metric name
 * it has already seen — so each test gets a fresh module against a cleared
 * registry rather than inheriting the last test's pending writes.
 */
let writer: typeof import('@/aggregate/writer.js');

function candle(overrides: Partial<CandleDoc> = {}): CandleDoc {
    return {
        tickerID: 'AAPL',
        timestamp: new Date('2026-09-04T15:30:00.000Z'),
        open: 100,
        high: 101,
        low: 99,
        close: 100.5,
        volume: 1_000,
        ...overrides,
    };
}

const opsOn = (
    collection: string,
): { updateOne: { filter: unknown; update: { $set: CandleDoc }; upsert: boolean } }[] =>
    db.current
        .of(collection)
        .writes.flatMap(
            (write) =>
                write.args[0] as { updateOne: { filter: unknown; update: { $set: CandleDoc }; upsert: boolean } }[],
        );

beforeEach(async () => {
    db.current = fakeDb();
    logged.errors = [];
    register.clear();
    vi.resetModules();
    writer = await import('@/aggregate/writer.js');
});

afterEach(async () => {
    await writer.stopWriter();
});

describe('enqueue', () => {
    it('buffers rather than writing — eight thousand buckets close in the same tick', () => {
        writer.enqueue('1m', candle());
        expect(writer.pendingWrites()).toBe(1);
        expect(db.current.collection).not.toHaveBeenCalled();
    });

    it('counts across every collection', () => {
        writer.enqueue('1m', candle());
        writer.enqueue('1d', candle());
        writer.enqueue('1d', candle({ tickerID: 'MSFT' }));
        expect(writer.pendingWrites()).toBe(3);
    });

    it.each(
        Object.entries({
            '1m': OHLCV_COLLECTIONS.intraday1m,
            '5m': OHLCV_COLLECTIONS.intraday5m,
            '15m': OHLCV_COLLECTIONS.intraday15m,
            '30m': OHLCV_COLLECTIONS.intraday30m,
            '1hr': OHLCV_COLLECTIONS.intraday1hr,
            '1d': OHLCV_COLLECTIONS.daily,
            '1w': OHLCV_COLLECTIONS.weekly,
        }),
    )('routes a %s candle to %s', async (timeframe, collection) => {
        writer.enqueue(timeframe as AggregatorTimeframe, candle());
        await writer.flush();
        expect(db.current.of(collection).writes).toHaveLength(1);
    });
});

describe('flush', () => {
    it('does nothing when nothing is buffered', async () => {
        await writer.flush();
        expect(db.current.collection).not.toHaveBeenCalled();
    });

    it('upserts on (tickerID, timestamp), which is what makes a replayed trade harmless', async () => {
        writer.enqueue('1m', candle());
        await writer.flush();

        const [operation] = opsOn(OHLCV_COLLECTIONS.intraday1m);
        expect(operation?.updateOne.upsert).toBe(true);
        expect(operation?.updateOne.filter).toEqual({
            tickerID: 'AAPL',
            timestamp: new Date('2026-09-04T15:30:00.000Z'),
        });
    });

    it('writes unordered — one rejected document must not abandon the batch', async () => {
        writer.enqueue('1m', candle());
        await writer.flush();
        expect(db.current.of(OHLCV_COLLECTIONS.intraday1m).writes[0]?.args[1]).toEqual({ ordered: false });
    });

    it('empties the buffer, so a second flush writes nothing', async () => {
        writer.enqueue('1m', candle());
        await writer.flush();
        expect(writer.pendingWrites()).toBe(0);

        await writer.flush();
        expect(db.current.of(OHLCV_COLLECTIONS.intraday1m).writes).toHaveLength(1);
    });

    it('splits a long buffer into batches', async () => {
        const size = config.candles.writeBatchSize;
        for (let index = 0; index < size + 1; index += 1) writer.enqueue('1m', candle({ tickerID: `S${index}` }));
        await writer.flush();
        expect(db.current.of(OHLCV_COLLECTIONS.intraday1m).writes).toHaveLength(2);
    });

    it('writes each collection independently, so one is not held up by another', async () => {
        writer.enqueue('1m', candle());
        writer.enqueue('1d', candle());
        await writer.flush();
        expect(db.current.of(OHLCV_COLLECTIONS.intraday1m).writes).toHaveLength(1);
        expect(db.current.of(OHLCV_COLLECTIONS.daily).writes).toHaveLength(1);
    });

    it('drops a failed batch rather than re-queueing it — a retry queue during an outage is how memory runs out', async () => {
        writer.enqueue('1m', candle());
        db.current.of(OHLCV_COLLECTIONS.intraday1m).bulkWrite.mockRejectedValueOnce(new Error('not primary'));

        await expect(writer.flush()).resolves.toBeUndefined();
        expect(logged.errors).toHaveLength(1);
        expect(writer.pendingWrites()).toBe(0);
    });
});

describe('the flush timer', () => {
    it('flushes on the configured interval once started', async () => {
        vi.useFakeTimers();
        writer.startWriter();
        writer.enqueue('1m', candle());

        await vi.advanceTimersByTimeAsync(config.candles.flushIntervalMs);
        expect(db.current.of(OHLCV_COLLECTIONS.intraday1m).writes).toHaveLength(1);
        vi.useRealTimers();
    });

    it('starts only one timer however many times it is called', async () => {
        vi.useFakeTimers();
        writer.startWriter();
        writer.startWriter();
        writer.enqueue('1m', candle());

        await vi.advanceTimersByTimeAsync(config.candles.flushIntervalMs);
        expect(db.current.of(OHLCV_COLLECTIONS.intraday1m).writes).toHaveLength(1);
        vi.useRealTimers();
    });

    it('writes what is still buffered when stopped — those candles are a gap nothing rebuilds', async () => {
        writer.startWriter();
        writer.enqueue('1m', candle());
        await writer.stopWriter();

        expect(db.current.of(OHLCV_COLLECTIONS.intraday1m).writes).toHaveLength(1);
        expect(writer.pendingWrites()).toBe(0);
    });

    it('stops flushing on the timer once stopped', async () => {
        vi.useFakeTimers();
        writer.startWriter();
        await writer.stopWriter();
        writer.enqueue('1m', candle());

        await vi.advanceTimersByTimeAsync(config.candles.flushIntervalMs * 4);
        expect(db.current.of(OHLCV_COLLECTIONS.intraday1m).writes).toEqual([]);
        vi.useRealTimers();
    });

    it('can be stopped when it was never started', async () => {
        await expect(writer.stopWriter()).resolves.toBeUndefined();
    });
});
