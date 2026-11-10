import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import { listAt } from '@/__tests__/support/values.js';
import type { VendorDailyBar, VendorMarketBar } from '@/lib/tiingo.js';
import { listSessions } from '@/utils/holidays.js';

type Asset = Awaited<ReturnType<typeof import('@/organize/universe.js').activeUniverse>>[number];

vi.mock('@/lib/logger.js', () => ({
    logger: {
        error: (): void => {},
        info: (): void => {},
        warn: (): void => {},
        debug: (): void => {},
    },
}));

const db: { current: DbStub } = { current: fakeDb() };
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const vendor: {
    rows: VendorMarketBar[];
    history: Record<string, VendorDailyBar[]>;
    asked: [string, string][];
    failing: Set<string>;
} = { rows: [], history: {}, asked: [], failing: new Set() };

vi.mock('@/lib/tiingo.js', () => ({
    marketPrices: (): Promise<VendorMarketBar[]> => Promise.resolve(vendor.rows),
    dailyHistory: (symbol: string, startDate: string): Promise<VendorDailyBar[]> => {
        vendor.asked.push([symbol, startDate]);
        if (vendor.failing.has(symbol)) return Promise.reject(new Error('vendor 500'));
        return Promise.resolve(vendor.history[symbol] ?? []);
    },
}));

const { refetchHistory, updateDailyPrices } = await import('@/organize/prices.js');

const { config } = await import('@/lib/config.js');

const SESSION = new Date('2026-09-04T00:00:00.000Z');
const CLOSING_MINUTE = new Date('2026-09-04T20:00:00.000Z');
const PREVIOUS = new Date('2026-09-03T00:00:00.000Z');
const LOOKBACK = listSessions(new Date(SESSION.getTime() - config.organize.gapLookbackDays * 86_400_000), SESSION);

function asset(symbol: string): Asset {
    return {
        symbol,
        assetType: 'Stock',
        exchange: 'NASDAQ',
        sector: '',
        industry: '',
        marketCap: null,
        sharesOutstanding: null,
        ipo: null,
    };
}

function row(overrides: Partial<VendorMarketBar> = {}): VendorMarketBar {
    return {
        ticker: 'AAPL',
        date: '2026-09-04T00:00:00.000Z',
        adjOpen: 100,
        adjHigh: 110,
        adjLow: 99,
        adjClose: 105,
        adjVolume: 1_000,
        splitFactor: 1,
        divCash: 0,
        ...overrides,
    };
}

/** The daily store's answer: `symbol` holds a bar for every session in the lookback but `except`. */
function stored(symbol: string, except: readonly Date[] = []): { _id: string; sessions: Date[] } {
    const skip = new Set([SESSION, ...except].map((day) => day.getTime()));
    return { _id: symbol, sessions: LOOKBACK.filter((day) => !skip.has(day.getTime())) };
}

/** Every document inserted into `collection`, across all its inserts. */
const insertedInto = (collection: string): unknown[] =>
    db.current
        .of(collection)
        .writes.filter((write) => write.method === 'insertMany')
        .flatMap((write) => listAt(write.args, 0));

beforeEach(() => {
    db.current = fakeDb();
    vendor.rows = [];
    vendor.history = {};
    vendor.asked = [];
    vendor.failing = new Set();
});

describe('updateDailyPrices', () => {
    it('writes nothing and reports nothing when the vendor returns nothing', async () => {
        await expect(updateDailyPrices([asset('AAPL')])).resolves.toEqual({
            written: 0,
            since: null,
            splits: [],
            dividends: [],
        });
        expect(db.current.of('OHCLVData').writes).toEqual([]);
    });

    it('ignores a symbol that is not in the universe', async () => {
        vendor.rows = [{ ...row(), ticker: 'NOTMINE' }];
        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({ written: 0 });
    });

    it("matches the vendor's ticker case-insensitively", async () => {
        vendor.rows = [{ ...row(), ticker: 'aapl' }];
        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({ written: 1 });
    });

    it("replaces the bell's bar on (tickerID, timestamp), stamped at midnight UTC", async () => {
        vendor.rows = [row()];
        await updateDailyPrices([asset('AAPL')]);

        const writes = db.current.of('OHCLVData').writes;
        expect(writes.map((write) => write.method)).toEqual(['deleteMany', 'insertMany']);
        expect(writes[0]?.args[0]).toEqual({ timestamp: SESSION, tickerID: { $in: ['AAPL'] } });
        expect(insertedInto('OHCLVData')).toEqual([
            { tickerID: 'AAPL', timestamp: SESSION, open: 100, high: 110, low: 99, close: 105, volume: 1_000 },
        ]);
    });

    it('stores the adjusted prices, which is the whole series it is joining', async () => {
        vendor.rows = [row()];
        await updateDailyPrices([asset('AAPL')]);
        expect(insertedInto('OHCLVData')).toMatchObject([{ close: 105 }]);
    });

    // A row short of a field never gets this far: the vendor client drops it
    it.each([
        ['an unparseable date', { date: 'not a date' }],
        ['an infinite adjusted high', { adjHigh: Number.POSITIVE_INFINITY }],
        ['a NaN adjusted close', { adjClose: Number.NaN }],
    ])('drops a row with %s rather than half-filling the bar', async (_label, overrides) => {
        vendor.rows = [row(overrides)];
        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({ written: 0 });
    });

    it('writes a synthetic closing-minute bar at 16:00 New York where none is stored', async () => {
        vendor.rows = [row()];
        await updateDailyPrices([asset('AAPL')]);

        expect(db.current.of('OHCLVData1m').filters[0]).toEqual({
            $or: [{ timestamp: CLOSING_MINUTE, tickerID: { $in: ['AAPL'] } }],
        });
        expect(insertedInto('OHCLVData1m')).toEqual([
            { tickerID: 'AAPL', timestamp: CLOSING_MINUTE, open: 105, high: 105, low: 105, close: 105, volume: 0 },
        ]);
    });

    it('stamps the closing minute at 21:00 UTC under standard time', async () => {
        vendor.rows = [row({ date: '2026-11-10T00:00:00.000Z' })];
        await updateDailyPrices([asset('AAPL')]);
        expect(insertedInto('OHCLVData1m')).toMatchObject([{ timestamp: new Date('2026-11-10T21:00:00.000Z') }]);
    });

    it('leaves a closing minute the aggregator built from real prints alone', async () => {
        vendor.rows = [row()];
        db.current = fakeDb({ OHCLVData1m: [{ tickerID: 'AAPL', timestamp: CLOSING_MINUTE }] });
        await updateDailyPrices([asset('AAPL')]);
        expect(db.current.of('OHCLVData1m').writes).toEqual([]);
    });

    it('reports a split rather than applying it — applying one rewrites a whole history', async () => {
        vendor.rows = [{ ...row(), splitFactor: 4 }];
        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({
            splits: [{ symbol: 'AAPL', at: new Date('2026-09-04T00:00:00.000Z'), factor: 4 }],
        });
    });

    it.each([
        ['a factor of one', 1],
        ['a non-finite factor', Number.NaN],
    ])('reports no split for %s', async (_label, splitFactor) => {
        vendor.rows = [{ ...row(), splitFactor }];
        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({ splits: [] });
    });

    it('reports a dividend the same way', async () => {
        vendor.rows = [{ ...row(), divCash: 0.25 }];
        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({
            dividends: [{ symbol: 'AAPL', at: new Date('2026-09-04T00:00:00.000Z'), amount: 0.25 }],
        });
    });

    it('reports no dividend for a zero payment', async () => {
        vendor.rows = [{ ...row(), divCash: 0 }];
        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({ dividends: [] });
    });

    it('splits the writes into batches and keeps them unordered', async () => {
        const size = config.organize.writeBatchSize;
        const universe = Array.from({ length: size + 1 }, (_unused, index) => asset(`S${index}`));
        vendor.rows = universe.map((one) => ({ ...row(), ticker: one.symbol }));
        await updateDailyPrices(universe);

        const inserts = db.current.of('OHCLVData').writes.filter((write) => write.method === 'insertMany');
        expect(inserts).toHaveLength(2);
        expect(inserts[0]?.args[1]).toEqual({ ordered: false });
    });

    it('fails the step when a write fails, rather than reporting bars it never stored', async () => {
        vendor.rows = [row()];
        db.current.of('OHCLVData').insertMany.mockRejectedValueOnce(new Error('write conflict'));
        await expect(updateDailyPrices([asset('AAPL')])).rejects.toThrow('write conflict');
    });
});

describe('updateDailyPrices, filling missing sessions', () => {
    it('asks the per-symbol endpoint nothing when every session is stored', async () => {
        vendor.rows = [row()];
        db.current = fakeDb({ OHCLVData: [stored('AAPL')] });
        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({ written: 1, since: SESSION });
        expect(vendor.asked).toEqual([]);
    });

    it('fetches a session the run missed from the first missing day, and writes only that one', async () => {
        vendor.rows = [row()];
        vendor.history = { AAPL: [row({ date: PREVIOUS.toISOString(), adjClose: 104 }), row()] };
        db.current = fakeDb({ OHCLVData: [stored('AAPL', [PREVIOUS])] });

        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({ written: 2, since: PREVIOUS });
        expect(vendor.asked).toEqual([['AAPL', '2026-09-03']]);
        expect(insertedInto('OHCLVData')).toMatchObject([
            { timestamp: PREVIOUS, close: 104 },
            { timestamp: SESSION, close: 105 },
        ]);
    });

    it("fetches tonight's bar too for a symbol the whole-market call left out", async () => {
        vendor.rows = [row()];
        vendor.history = { MSFT: [row({ ticker: 'MSFT' })] };
        db.current = fakeDb({ OHCLVData: [stored('AAPL'), stored('MSFT')] });

        await updateDailyPrices([asset('AAPL'), asset('MSFT')]);
        expect(vendor.asked).toEqual([['MSFT', '2026-09-04']]);
        expect(insertedInto('OHCLVData')).toMatchObject([{ tickerID: 'MSFT' }, { tickerID: 'AAPL' }]);
    });

    it('reports a split or dividend that fell on a filled session', async () => {
        vendor.rows = [row()];
        vendor.history = { AAPL: [row({ date: PREVIOUS.toISOString(), splitFactor: 2, divCash: 0.25 })] };
        db.current = fakeDb({ OHCLVData: [stored('AAPL', [PREVIOUS])] });

        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({
            splits: [{ symbol: 'AAPL', at: PREVIOUS, factor: 2 }],
            dividends: [{ symbol: 'AAPL', at: PREVIOUS, amount: 0.25 }],
        });
    });

    it("keeps tonight's bars when a per-symbol request fails, leaving the hole for the next run", async () => {
        vendor.rows = [row()];
        vendor.failing = new Set(['AAPL']);
        db.current = fakeDb({ OHCLVData: [stored('AAPL', [PREVIOUS])] });

        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({ written: 1, since: SESSION });
    });

    it('looks for holes only up to the latest session the whole-market call carried', async () => {
        vendor.rows = [row()];
        db.current = fakeDb({ OHCLVData: [stored('AAPL')] });
        await updateDailyPrices([asset('AAPL')]);

        expect(db.current.of('OHCLVData').filters[0]).toEqual([
            { $match: { timestamp: { $gte: new Date('2026-08-21T00:00:00.000Z'), $lte: SESSION } } },
            { $group: { _id: '$tickerID', sessions: { $addToSet: '$timestamp' } } },
        ]);
    });
});

describe('refetchHistory', () => {
    it('does nothing at all when the vendor sent no usable bars', async () => {
        await expect(refetchHistory('AAPL', [])).resolves.toBe(0);
        expect(db.current.of('OHCLVData').writes).toEqual([]);
    });

    it("deletes the symbol's history before inserting the replacement", async () => {
        await refetchHistory('AAPL', [row()]);
        const writes = db.current.of('OHCLVData').writes;
        expect(writes[0]?.method).toBe('deleteMany');
        expect(writes[0]?.args[0]).toEqual({ tickerID: 'AAPL' });
        expect(writes[1]?.method).toBe('insertMany');
    });

    it('returns how many bars it stored, dropping the unusable ones', async () => {
        await expect(refetchHistory('AAPL', [row(), row({ adjClose: Number.NaN })])).resolves.toBe(1);
    });

    it('batches a long history', async () => {
        const size = config.organize.writeBatchSize;
        const history = Array.from({ length: size + 1 }, (_unused, index) => ({
            ...row(),
            date: `2026-01-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
        }));
        await refetchHistory('AAPL', history);
        expect(db.current.of('OHCLVData').writes.filter((write) => write.method === 'insertMany')).toHaveLength(2);
    });
});
