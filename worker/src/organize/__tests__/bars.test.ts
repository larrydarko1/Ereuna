import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const { dailySeries, lifetimeStats } = await import('@/organize/bars.js');

/** The aggregation answers newest-first, which is what the index walk produces. */
function descendingBars(count: number): Record<string, unknown>[] {
    return Array.from({ length: count }, (_unused, index) => ({
        timestamp: new Date(Date.UTC(2026, 0, count - index)),
        open: 10 + index,
        high: 12 + index,
        low: 9 + index,
        close: 11 + index,
        volume: 100 + index,
    }));
}

beforeEach(() => {
    db.current = fakeDb();
});

describe('dailySeries', () => {
    it('asks for nothing at all when given no symbols', async () => {
        await expect(dailySeries([])).resolves.toEqual(new Map());
        expect(db.current.of('OHCLVData').aggregate).not.toHaveBeenCalled();
    });

    it('reverses the newest-first rows into the ascending order every indicator expects', async () => {
        db.current = fakeDb({ OHCLVData: [{ _id: 'AAPL', bars: descendingBars(3) }] });
        const series = await dailySeries(['AAPL']);
        const aapl = series.get('AAPL');
        expect(aapl?.closes).toEqual([13, 12, 11]);
        expect(aapl?.timestamps.map((date) => date.getUTCDate())).toEqual([1, 2, 3]);
    });

    it('splits each bar into its own parallel array', async () => {
        db.current = fakeDb({ OHCLVData: [{ _id: 'AAPL', bars: descendingBars(1) }] });
        const aapl = (await dailySeries(['AAPL'])).get('AAPL');
        expect(aapl).toEqual({
            timestamps: [new Date(Date.UTC(2026, 0, 1))],
            opens: [10],
            highs: [12],
            lows: [9],
            closes: [11],
            volumes: [100],
        });
    });

    it('matches only the symbols asked for, and slices to the window', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        await dailySeries(['AAPL', 'MSFT'], 50);
        const [pipeline] = db.current.of('OHCLVData').filters as Record<string, unknown>[][];
        expect(pipeline?.[0]).toEqual({ $match: { tickerID: { $in: ['AAPL', 'MSFT'] } } });
        expect(pipeline?.[3]).toEqual({ $project: { bars: { $slice: ['$bars', 50] } } });
    });

    it('defaults the window to 400 bars', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        await dailySeries(['AAPL']);
        const [pipeline] = db.current.of('OHCLVData').filters as Record<string, unknown>[][];
        expect(pipeline?.[3]).toEqual({ $project: { bars: { $slice: ['$bars', 400] } } });
    });

    it('keys the map by symbol, one entry per symbol that had bars', async () => {
        db.current = fakeDb({
            OHCLVData: [
                { _id: 'AAPL', bars: descendingBars(1) },
                { _id: 'MSFT', bars: descendingBars(1) },
            ],
        });
        expect([...(await dailySeries(['AAPL', 'MSFT', 'NVDA'])).keys()]).toEqual(['AAPL', 'MSFT']);
    });
});

describe('lifetimeStats', () => {
    it('lifts the grouped `_id` out into the map key', async () => {
        const stats = {
            high: 200,
            low: 1,
            firstClose: 2,
            firstTimestamp: new Date('1990-01-02T00:00:00.000Z'),
            lastClose: 180,
            lastTimestamp: new Date('2026-09-04T00:00:00.000Z'),
        };
        db.current = fakeDb({ OHCLVData: [{ _id: 'AAPL', ...stats }] });
        await expect(lifetimeStats()).resolves.toEqual(new Map([['AAPL', stats]]));
    });

    it('allows disk use — this is the one query that reads every bar in the collection', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        await lifetimeStats();
        expect(db.current.of('OHCLVData').aggregate).toHaveBeenCalledWith(expect.anything(), { allowDiskUse: true });
    });

    it('groups ascending, so `$first` is the listing and `$last` is the latest bar', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        await lifetimeStats();
        const [pipeline] = db.current.of('OHCLVData').filters as Record<string, unknown>[][];
        expect(pipeline?.[0]).toEqual({ $sort: { tickerID: 1, timestamp: 1 } });
    });
});
