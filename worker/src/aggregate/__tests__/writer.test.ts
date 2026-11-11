import { register } from 'prom-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OHLCV_COLLECTIONS } from '@ereuna/shared';

import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import { listAt } from '@/__tests__/support/values.js';
import type { CandleDoc } from '@/aggregate/writer.js';

const db: { current: DbStub } = { current: fakeDb() };
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const logged: { errors: unknown[] } = { errors: [] };
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

/** Every write `collection` received with `method`, oldest first. */
const callsOf = (collection: string, method: string): unknown[][] =>
    db.current
        .of(collection)
        .writes.filter((write) => write.method === method)
        .map((write) => write.args);

/** Every document inserted into `collection`, across all its inserts. */
const insertedInto = (collection: string): unknown[] =>
    callsOf(collection, 'insertMany').flatMap((args) => listAt(args, 0));

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

    it.each([
        ['1m', OHLCV_COLLECTIONS.intraday1m],
        ['5m', OHLCV_COLLECTIONS.intraday5m],
        ['15m', OHLCV_COLLECTIONS.intraday15m],
        ['30m', OHLCV_COLLECTIONS.intraday30m],
        ['1hr', OHLCV_COLLECTIONS.intraday1hr],
        ['1d', OHLCV_COLLECTIONS.daily],
        ['1w', OHLCV_COLLECTIONS.weekly],
    ] as const)('routes a %s candle to %s', async (timeframe, collection) => {
        writer.enqueue(timeframe, candle());
        await writer.flush();
        expect(insertedInto(collection)).toEqual([candle()]);
    });
});

describe('flush', () => {
    it('does nothing when nothing is buffered', async () => {
        await writer.flush();
        expect(db.current.collection).not.toHaveBeenCalled();
    });

    it('replaces on (tickerID, timestamp): deletes the stored candle, then inserts', async () => {
        writer.enqueue('1m', candle());
        await writer.flush();

        const writes = db.current.of(OHLCV_COLLECTIONS.intraday1m).writes;
        expect(writes.map((write) => write.method)).toEqual(['deleteMany', 'insertMany']);
        expect(writes[0]?.args[0]).toEqual({
            timestamp: new Date('2026-09-04T15:30:00.000Z'),
            tickerID: { $in: ['AAPL'] },
        });
    });

    it('keeps only the last close of a bucket closed twice before a flush', async () => {
        writer.enqueue('1w', candle({ close: 100 }));
        writer.enqueue('1w', candle({ close: 102 }));
        await writer.flush();
        expect(insertedInto(OHLCV_COLLECTIONS.weekly)).toEqual([candle({ close: 102 })]);
    });

    it('writes unordered — one rejected document must not abandon the batch', async () => {
        writer.enqueue('1m', candle());
        await writer.flush();
        expect(callsOf(OHLCV_COLLECTIONS.intraday1m, 'insertMany')[0]?.[1]).toEqual({ ordered: false });
    });

    it('empties the buffer, so a second flush writes nothing', async () => {
        writer.enqueue('1m', candle());
        await writer.flush();
        expect(writer.pendingWrites()).toBe(0);

        await writer.flush();
        expect(callsOf(OHLCV_COLLECTIONS.intraday1m, 'insertMany')).toHaveLength(1);
    });

    it('splits a long buffer into batches', async () => {
        const size = config.candles.writeBatchSize;
        for (let index = 0; index < size + 1; index += 1) writer.enqueue('1m', candle({ tickerID: `S${index}` }));
        await writer.flush();
        expect(callsOf(OHLCV_COLLECTIONS.intraday1m, 'insertMany')).toHaveLength(2);
    });

    it('writes each collection independently, so one is not held up by another', async () => {
        writer.enqueue('1m', candle());
        writer.enqueue('1d', candle());
        await writer.flush();
        expect(insertedInto(OHLCV_COLLECTIONS.intraday1m)).toHaveLength(1);
        expect(insertedInto(OHLCV_COLLECTIONS.daily)).toHaveLength(1);
    });

    it('drops a failed batch rather than re-queueing it — a retry queue during an outage is how memory runs out', async () => {
        writer.enqueue('1m', candle());
        db.current.of(OHLCV_COLLECTIONS.intraday1m).insertMany.mockRejectedValueOnce(new Error('not primary'));

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
        expect(insertedInto(OHLCV_COLLECTIONS.intraday1m)).toHaveLength(1);
        vi.useRealTimers();
    });

    it('starts only one timer however many times it is called', async () => {
        vi.useFakeTimers();
        writer.startWriter();
        writer.startWriter();
        writer.enqueue('1m', candle());

        await vi.advanceTimersByTimeAsync(config.candles.flushIntervalMs);
        expect(insertedInto(OHLCV_COLLECTIONS.intraday1m)).toHaveLength(1);
        vi.useRealTimers();
    });

    it('writes what is still buffered when stopped — those candles are a gap nothing rebuilds', async () => {
        writer.startWriter();
        writer.enqueue('1m', candle());
        await writer.stopWriter();

        expect(insertedInto(OHLCV_COLLECTIONS.intraday1m)).toHaveLength(1);
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
