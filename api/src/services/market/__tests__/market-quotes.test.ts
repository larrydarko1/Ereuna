import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const cache: { keys: string[] } = { keys: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/cache.js', () => ({
    marketKey: (...parts: string[]) => `m:${parts.join(':')}`,
    withCache: (key: string, fetcher: () => Promise<unknown>) => {
        cache.keys.push(key);
        return fetcher();
    },
}));

const { closeOnOrAfter, latestCloses, quotes } = await import('@/services/market/market-quotes.js');

const pipelineOf = (index = 0): Record<string, unknown>[] =>
    (db.current.of('OHCLVData').filters[index] as Record<string, unknown>[]) ?? [];

beforeEach(() => {
    db.current = fakeDb({ OHCLVData: [] });
    cache.keys = [];
});

describe('latestCloses', () => {
    it('asks for nothing when given no symbols', async () => {
        await expect(latestCloses([])).resolves.toEqual(new Map());
        expect(db.current.of('OHCLVData').aggregate).not.toHaveBeenCalled();
    });

    it('keys the newest close by symbol', async () => {
        db.current = fakeDb({ OHCLVData: [{ _id: 'AAPL', close: 190 }] });
        await expect(latestCloses(['AAPL'])).resolves.toEqual(new Map([['AAPL', 190]]));
    });

    it('takes the first bar of a newest-first sort, which is one pass rather than one query per symbol', async () => {
        await latestCloses(['AAPL']);
        expect(pipelineOf()[1]).toEqual({ $sort: { timestamp: -1 } });
        expect(pipelineOf()[2]).toEqual({ $group: { _id: '$tickerID', close: { $first: '$close' } } });
    });

    it('batches, so an unbounded symbol list is not an unbounded server-side sort', async () => {
        await latestCloses(Array.from({ length: 501 }, (_u, i) => `S${i}`));
        expect(db.current.of('OHCLVData').aggregate).toHaveBeenCalledTimes(2);

        const [firstMatch] = pipelineOf() as { $match: { tickerID: { $in: string[] } } }[];
        expect(firstMatch?.$match.tickerID.$in).toHaveLength(500);
    });

    it('leaves a symbol with no bars out of the map rather than reporting a zero', async () => {
        db.current = fakeDb({ OHCLVData: [{ _id: 'AAPL', close: 190 }] });
        const closes = await latestCloses(['AAPL', 'NEWCO']);
        expect(closes.has('NEWCO')).toBe(false);
    });
});

describe('quotes', () => {
    const bars = (...closes: number[]): Record<string, unknown> => ({
        _id: 'AAPL',
        bars: closes.map((close, index) => ({
            close,
            timestamp: new Date(Date.UTC(2026, 0, 10 - index)),
        })),
    });

    it('returns nothing for an empty symbol list, without a cache lookup', async () => {
        await expect(quotes([])).resolves.toEqual([]);
        expect(cache.keys).toEqual([]);
    });

    it('reports the day-over-day change and percentage', async () => {
        db.current = fakeDb({ OHCLVData: [bars(110, 100)] });
        await expect(quotes(['AAPL'])).resolves.toEqual([
            {
                symbol: 'AAPL',
                close: 110,
                timestamp: '2026-01-10T00:00:00.000Z',
                previousClose: 100,
                change: 10,
                changePercent: 10,
            },
        ]);
    });

    it('rounds both to the cent', async () => {
        db.current = fakeDb({ OHCLVData: [bars(100.005, 99.994)] });
        const [quote] = await quotes(['AAPL']);
        expect(quote?.change).toBe(0.01);
        expect(quote?.changePercent).toBe(0.01);
    });

    it('reports no change for a symbol with only one bar — zero would be a claim the data cannot support', async () => {
        db.current = fakeDb({ OHCLVData: [bars(110)] });
        await expect(quotes(['AAPL'])).resolves.toEqual([
            {
                symbol: 'AAPL',
                close: 110,
                timestamp: '2026-01-10T00:00:00.000Z',
                previousClose: null,
                change: null,
                changePercent: null,
            },
        ]);
    });

    it('reports no change against a previous close of zero, rather than dividing by it', async () => {
        db.current = fakeDb({ OHCLVData: [bars(110, 0)] });
        const [quote] = await quotes(['AAPL']);
        expect(quote?.change).toBeNull();
        expect(quote?.previousClose).toBe(0);
    });

    it('answers a symbol with no bars at all as a flat zero rather than dropping it', async () => {
        db.current = fakeDb({ OHCLVData: [{ _id: 'NEWCO', bars: [] }] });
        await expect(quotes(['NEWCO'])).resolves.toEqual([
            {
                symbol: 'NEWCO',
                close: 0,
                timestamp: '1970-01-01T00:00:00.000Z',
                previousClose: null,
                change: null,
                changePercent: null,
            },
        ]);
    });

    it('takes the two newest bars in one pass', async () => {
        await quotes(['AAPL']);
        expect(pipelineOf()[3]).toEqual({ $project: { bars: { $slice: ['$bars', 2] } } });
    });

    it('caches under a hash, so a 500-symbol watchlist is not a multi-kilobyte key', async () => {
        await quotes(['AAPL', 'MSFT']);
        expect(cache.keys[0]).toMatch(/^m:quotes:[0-9a-f]{64}$/);
    });

    it('shares one entry between two callers asking for the same symbols in a different order', async () => {
        await quotes(['AAPL', 'MSFT']);
        await quotes(['MSFT', 'AAPL']);
        expect(cache.keys[0]).toBe(cache.keys[1]);
    });

    it('batches a long symbol list', async () => {
        await quotes(Array.from({ length: 501 }, (_u, i) => `S${i}`));
        expect(db.current.of('OHCLVData').aggregate).toHaveBeenCalledTimes(2);
    });
});

describe('closeOnOrAfter', () => {
    it('takes the first bar at or after the date, oldest first', async () => {
        db.current = fakeDb({ OHCLVData: [{ close: 150 }] });
        const from = new Date('2026-01-02T00:00:00.000Z');

        await expect(closeOnOrAfter('SPY', from)).resolves.toBe(150);
        const [filter, options] = db.current.of('OHCLVData').findOne.mock.calls[0] ?? [];
        expect(filter).toEqual({ tickerID: 'SPY', timestamp: { $gte: from } });
        expect(options).toEqual({ sort: { timestamp: 1 }, projection: { close: 1 } });
    });

    it('reports nothing when the instrument has no bar in range', async () => {
        db.current.of('OHCLVData').results.findOne = null;
        await expect(closeOnOrAfter('SPY', new Date())).resolves.toBeNull();
    });
});
