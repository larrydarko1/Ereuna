import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ZodType } from 'zod';

import { isList, type AggregateMessage } from '@ereuna/shared';

import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import { at } from '@/__tests__/support/values.js';

const db: { current: DbStub } = { current: fakeDb() };
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const cache: { keys: string[] } = { keys: [] };
vi.mock('@/lib/cache.js', () => ({
    marketKey: (...parts: string[]) => `m:${parts.join(':')}`,
    withCache: async (key: string, schema: ZodType, fetcher: () => Promise<unknown>) => {
        cache.keys.push(key);
        // Answered the way a hit is: through JSON and the call site's schema
        return schema.parse(JSON.parse(JSON.stringify(await fetcher())));
    },
}));

const live: { buckets: Map<string, AggregateMessage>; reads: string[] } = { buckets: new Map(), reads: [] };
vi.mock('@/lib/last-bucket.js', () => ({
    readLastCandle: (symbol: string, timeframe: string) => {
        live.reads.push(`${symbol}:${timeframe}`);
        return Promise.resolve(live.buckets.get(symbol) ?? null);
    },
}));

const { closeOnOrAfter, latestCloses, percentChange, quotes } = await import('@/services/market/market-quotes.js');

const pipelineOf = (index = 0): unknown[] => {
    const stages = db.current.of('OHCLVData').filters[index];
    return isList(stages) ? stages : [];
};

beforeEach(() => {
    db.current = fakeDb({ OHCLVData: [] });
    cache.keys = [];
    live.buckets = new Map();
    live.reads = [];
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

        expect(at(pipelineOf(), 0, '$match', 'tickerID', '$in')).toHaveLength(500);
    });

    it('leaves a symbol with no bars out of the map rather than reporting a zero', async () => {
        db.current = fakeDb({ OHCLVData: [{ _id: 'AAPL', close: 190 }] });
        const closes = await latestCloses(['AAPL', 'NEWCO']);
        expect(closes.has('NEWCO')).toBe(false);
    });

    it('reads only bars stamped before `before`, so a day written early cannot be its own reference', async () => {
        const before = new Date('2026-03-02T00:00:00.000Z');
        await latestCloses(['AAPL'], { before });
        expect(pipelineOf()[0]).toEqual({ $match: { tickerID: { $in: ['AAPL'] }, timestamp: { $lt: before } } });
    });

    it('puts no date on the match without `before`', async () => {
        await latestCloses(['AAPL']);
        expect(pipelineOf()[0]).toEqual({ $match: { tickerID: { $in: ['AAPL'] } } });
    });
});

describe('percentChange', () => {
    it('measures the move to two places', () => {
        expect(percentChange(181, 150)).toBe(20.67);
    });

    it.each([undefined, 0])('is null with no usable reference (%s)', (previous) => {
        expect(percentChange(181, previous)).toBeNull();
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

    describe("today's bar", () => {
        const today = (close: number, symbol = 'AAPL'): AggregateMessage => ({
            tickerID: symbol,
            timeframe: '1d',
            timestamp: '2026-01-11T00:00:00.000Z',
            open: close,
            high: close,
            low: close,
            close,
            volume: 1_000,
            final: false,
        });

        it("reads the aggregator's daily bucket", async () => {
            await quotes(['AAPL']);
            expect(live.reads).toEqual(['AAPL:1d']);
        });

        // The aggregator stores the daily bar at the bell, so during the session the newest stored bar is yesterday's
        it('prices the session from it, against the newest stored close', async () => {
            db.current = fakeDb({ OHCLVData: [bars(110, 100)] });
            live.buckets.set('AAPL', today(121));

            await expect(quotes(['AAPL'])).resolves.toEqual([
                {
                    symbol: 'AAPL',
                    close: 121,
                    timestamp: '2026-01-11T00:00:00.000Z',
                    previousClose: 110,
                    change: 11,
                    changePercent: 10,
                },
            ]);
        });

        it('replaces the stored copy the bell wrote, rather than measuring the day against itself', async () => {
            db.current = fakeDb({
                OHCLVData: [
                    {
                        _id: 'AAPL',
                        bars: [
                            { close: 120, timestamp: new Date('2026-01-11T00:00:00.000Z') },
                            { close: 100, timestamp: new Date('2026-01-10T00:00:00.000Z') },
                        ],
                    },
                ],
            });
            live.buckets.set('AAPL', today(121));

            const [quote] = await quotes(['AAPL']);
            expect(quote).toMatchObject({ close: 121, previousClose: 100, change: 21 });
        });

        it('prices a listing with no stored history, with no change to report', async () => {
            live.buckets.set('NEWCO', today(5, 'NEWCO'));

            await expect(quotes(['NEWCO'])).resolves.toEqual([
                {
                    symbol: 'NEWCO',
                    close: 5,
                    timestamp: '2026-01-11T00:00:00.000Z',
                    previousClose: null,
                    change: null,
                    changePercent: null,
                },
            ]);
        });
    });
});

describe('closeOnOrAfter', () => {
    it('takes the first bar at or after the date, oldest first', async () => {
        db.current = fakeDb({ OHCLVData: [{ close: 150 }] });
        const from = new Date('2026-01-02T00:00:00.000Z');

        await expect(closeOnOrAfter('SPY', from)).resolves.toBe(150);
        expect(db.current.of('OHCLVData').findOne).toHaveBeenCalledWith(
            { tickerID: 'SPY', timestamp: { $gte: from } },
            { sort: { timestamp: 1 }, projection: { close: 1 } },
        );
    });

    it('reports nothing when the instrument has no bar in range', async () => {
        db.current.of('OHCLVData').results.findOne = null;
        await expect(closeOnOrAfter('SPY', new Date())).resolves.toBeNull();
    });
});
