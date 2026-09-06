import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const clock: { open: boolean } = { open: false };
const calls: { closed: number; swept: number; flushed: number; seeded: unknown[][] } = {
    closed: 0,
    swept: 0,
    flushed: 0,
    seeded: [],
};
const logged: { errors: unknown[] } = { errors: [] };

vi.mock('@ereuna/shared', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@ereuna/shared')>()),
    isMarketHours: () => clock.open,
}));
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
vi.mock('@/aggregate/builder.js', () => ({
    closeSession: (): void => {
        calls.closed += 1;
    },
    sweep: (): void => {
        calls.swept += 1;
    },
    seedWeekly: (bars: unknown[]): void => {
        calls.seeded.push(bars);
    },
    openBucketCount: () => 0,
}));
vi.mock('@/aggregate/writer.js', () => ({
    flush: (): Promise<void> => {
        calls.flushed += 1;
        return Promise.resolve();
    },
    pendingWrites: () => 0,
}));

const { config } = await import('@/lib/config.js');

/** `wasOpen` is module state that a suite has to be able to rewind. */
let session: typeof import('@/aggregate/session.js');

beforeEach(async () => {
    db.current = fakeDb({ OHCLVData2: [] });
    clock.open = false;
    calls.closed = 0;
    calls.swept = 0;
    calls.flushed = 0;
    calls.seeded = [];
    logged.errors = [];
    vi.useFakeTimers();
    vi.resetModules();
    session = await import('@/aggregate/session.js');
});

afterEach(() => {
    session.stopSession();
    vi.useRealTimers();
});

describe('startSession', () => {
    it('restores the week-to-date bars when the market is already open', async () => {
        clock.open = true;
        db.current = fakeDb({ OHCLVData2: [{ tickerID: 'AAPL' }] });
        await session.startSession();
        expect(calls.seeded).toEqual([[{ tickerID: 'AAPL' }]]);
    });

    it('restores nothing when the market is shut', async () => {
        await session.startSession();
        expect(calls.seeded).toEqual([]);
    });

    it('reads the weekly bars for the Monday the week started on', async () => {
        clock.open = true;
        await session.startSession();
        const filter = db.current.of('OHCLVData2').filters[0] as { timestamp: Date };
        expect(filter.timestamp.getUTCDay()).toBe(1);
    });

    it('survives a failed restore — the organizer rebuilds the week overnight', async () => {
        clock.open = true;
        db.current = fakeDb({ OHCLVData2: [] });
        db.current.of('OHCLVData2').find.mockImplementationOnce(() => {
            throw new Error('not primary');
        });
        await expect(session.startSession()).resolves.toBeUndefined();
        expect(logged.errors).toHaveLength(1);
    });

    it('sweeps closed buckets on the configured interval', async () => {
        await session.startSession();
        await vi.advanceTimersByTimeAsync(config.candles.sweepIntervalMs * 3);
        expect(calls.swept).toBe(3);
    });
});

describe('the session edges', () => {
    it('restores the week-to-date bars when the market opens under it', async () => {
        await session.startSession();
        clock.open = true;
        await vi.advanceTimersByTimeAsync(config.candles.sweepIntervalMs);
        expect(calls.seeded).toHaveLength(1);
    });

    it('finalises every open bucket and flushes when the market closes', async () => {
        clock.open = true;
        await session.startSession();

        clock.open = false;
        await vi.advanceTimersByTimeAsync(config.candles.sweepIntervalMs);
        expect(calls.closed).toBe(1);
        expect(calls.flushed).toBe(1);
    });

    it('crosses each edge once, not on every tick', async () => {
        clock.open = true;
        await session.startSession();
        clock.open = false;
        await vi.advanceTimersByTimeAsync(config.candles.sweepIntervalMs * 4);
        expect(calls.closed).toBe(1);
    });

    it('keeps sweeping while the market stays open', async () => {
        clock.open = true;
        await session.startSession();
        await vi.advanceTimersByTimeAsync(config.candles.sweepIntervalMs * 2);
        expect(calls.closed).toBe(0);
        expect(calls.swept).toBe(2);
    });
});

describe('stopSession', () => {
    it('stops the ticker', async () => {
        await session.startSession();
        session.stopSession();
        await vi.advanceTimersByTimeAsync(config.candles.sweepIntervalMs * 4);
        expect(calls.swept).toBe(0);
    });

    it('can be called when the session was never started', () => {
        expect(() => session.stopSession()).not.toThrow();
    });
});
