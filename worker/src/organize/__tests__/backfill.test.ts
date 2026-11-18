import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import { listAt } from '@/__tests__/support/values.js';
import type { VendorDailyBar } from '@/lib/tiingo.js';
import type { Asset } from '@/organize/universe.js';

vi.mock('@/lib/logger.js', () => ({
    logger: { error: (): void => {}, info: (): void => {}, warn: (): void => {}, debug: (): void => {} },
}));
const db: { current: DbStub } = { current: fakeDb() };
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
const vendor: {
    history: Record<string, VendorDailyBar[]>;
    asked: [string, string][];
    failing: Set<string>;
    limitedFrom: string | null;
} = {
    history: {},
    asked: [],
    failing: new Set(),
    limitedFrom: null,
};
vi.mock('@/lib/tiingo.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('@/lib/tiingo.js')>();
    return {
        TiingoLimitError: real.TiingoLimitError,
        dailyHistory: (symbol: string, startDate = '1960-01-01'): Promise<VendorDailyBar[]> => {
            vendor.asked.push([symbol, startDate]);
            if (vendor.limitedFrom !== null && symbol >= vendor.limitedFrom) {
                return Promise.reject(new real.TiingoLimitError(`/tiingo/daily/${symbol}/prices`));
            }
            if (vendor.failing.has(symbol)) return Promise.reject(new Error('Tiingo responded 404'));
            return Promise.resolve(vendor.history[symbol] ?? []);
        },
    };
});
const universe: { symbols: string[] } = { symbols: [] };
vi.mock('@/organize/universe.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/organize/universe.js')>()),
    activeUniverse: (): Promise<Asset[]> => Promise.resolve(universe.symbols.map(asset)),
}));
const actions: { splits: unknown[]; dividends: unknown[] } = { splits: [], dividends: [] };
vi.mock('@/organize/corporate-actions.js', () => ({
    recordSplit: (split: unknown): Promise<boolean> => {
        actions.splits.push(split);
        return Promise.resolve(true);
    },
    applyDividends: (dividends: unknown[]): Promise<number> => {
        actions.dividends.push(...dividends);
        return Promise.resolve(dividends.length);
    },
}));
const weeks: { since: [string[], Date][]; rebuilt: string[] } = { since: [], rebuilt: [] };
vi.mock('@/organize/weekly.js', () => ({
    updateWeeksFor: (symbols: string[], since: Date): Promise<number> => {
        weeks.since.push([symbols, since]);
        return Promise.resolve(0);
    },
    rebuildWeekly: (symbol: string): Promise<number> => {
        weeks.rebuilt.push(symbol);
        return Promise.resolve(0);
    },
}));

const { backfill } = await import('@/organize/backfill.js');

// A Tuesday after Labor Day, so the last session before it is Friday the 4th
const NOW = new Date('2026-09-08T12:00:00.000Z');

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

function day(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
}

function row(date: string, overrides: Partial<VendorDailyBar> = {}): VendorDailyBar {
    return {
        date: `${date}T00:00:00.000Z`,
        open: 100,
        high: 110,
        low: 99,
        close: 105,
        volume: 1_000,
        splitFactor: 1,
        divCash: 0,
        ...overrides,
    };
}

/** The daily store holding a bar on each of `dates`. */
function storing(...dates: string[]): DbStub {
    return fakeDb({ OHCLVData: dates.map((date) => ({ timestamp: day(date) })) });
}

const insertedInto = (collection: string): unknown[] =>
    db.current
        .of(collection)
        .writes.filter((write) => write.method === 'insertMany')
        .flatMap((write) => listAt(write.args, 0));

beforeEach(() => {
    db.current = fakeDb();
    vendor.history = {};
    vendor.asked = [];
    vendor.failing = new Set();
    vendor.limitedFrom = null;
    universe.symbols = ['AAPL'];
    actions.splits = [];
    actions.dividends = [];
    weeks.since = [];
    weeks.rebuilt = [];
});

describe('backfill', () => {
    it('asks the vendor nothing for a symbol that has every session through the last one', async () => {
        db.current = storing('2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04');
        await expect(backfill(NOW)).resolves.toMatchObject({ symbols: 1, current: 1, filled: 0, written: 0 });
        expect(vendor.asked).toEqual([]);
    });

    it('fills from the first missing session, even when the live feed already wrote a bar after it', async () => {
        db.current = storing('2026-09-01', '2026-09-04');
        vendor.history = { AAPL: [row('2026-09-02'), row('2026-09-03'), row('2026-09-04', { close: 107 })] };

        await expect(backfill(NOW)).resolves.toMatchObject({ filled: 1, written: 3 });
        expect(vendor.asked).toEqual([['AAPL', '2026-09-02']]);
        expect(db.current.of('OHCLVData').writes[0]).toEqual({
            method: 'deleteMany',
            args: [{ tickerID: 'AAPL', timestamp: { $gte: day('2026-09-02') } }],
        });
        expect(insertedInto('OHCLVData')).toMatchObject([
            { timestamp: day('2026-09-02'), close: 105 },
            { timestamp: day('2026-09-03'), close: 105 },
            { timestamp: day('2026-09-04'), close: 107 },
        ]);
    });

    it('asks for the whole history of a symbol with no bar stored at all', async () => {
        vendor.history = { AAPL: [row('2026-09-04')] };
        await backfill(NOW);
        expect(vendor.asked).toEqual([['AAPL', '1960-01-01']]);
    });

    it('resumes after the last bar of a symbol with none in the lookback', async () => {
        const daily = db.current.of('OHCLVData');
        daily.find.mockReturnValueOnce({ toArray: () => Promise.resolve([]) });
        daily.find.mockReturnValueOnce({
            sort: () => ({ limit: () => ({ toArray: () => Promise.resolve([{ timestamp: day('2025-06-02') }]) }) }),
        });

        await backfill(NOW);
        expect(vendor.asked).toEqual([['AAPL', '2025-06-03']]);
    });

    it('writes a closing minute only for the sessions the intraday store still keeps', async () => {
        db.current = storing('2026-08-03');
        vendor.history = { AAPL: [row('2026-08-04'), row('2026-09-04')] };

        await backfill(NOW);
        expect(insertedInto('OHCLVData1m')).toEqual([
            {
                tickerID: 'AAPL',
                timestamp: new Date('2026-09-04T19:59:00.000Z'),
                open: 105,
                high: 105,
                low: 105,
                close: 105,
                volume: 0,
            },
        ]);
    });

    it('rebuilds the weeks from the start of the gap', async () => {
        db.current = storing('2026-09-01', '2026-09-04');
        vendor.history = { AAPL: [row('2026-09-02'), row('2026-09-03')] };

        await backfill(NOW);
        expect(weeks.since).toEqual([[['AAPL'], day('2026-09-02')]]);
    });

    it('records the dividends paid during the gap', async () => {
        db.current = storing('2026-09-01', '2026-09-04');
        vendor.history = { AAPL: [row('2026-09-02', { divCash: 0.26 }), row('2026-09-03')] };

        await backfill(NOW);
        expect(actions.dividends).toEqual([{ symbol: 'AAPL', at: day('2026-09-02'), amount: 0.26 }]);
    });

    it('refetches the whole history, restated, for a symbol that split during its gap', async () => {
        db.current = storing('2026-09-01', '2026-09-04');
        vendor.history = {
            AAPL: [row('2026-08-31', { close: 400 }), row('2026-09-02', { close: 100, splitFactor: 4 })],
        };

        await expect(backfill(NOW)).resolves.toMatchObject({ restated: 1, filled: 0 });
        expect(actions.splits).toEqual([{ symbol: 'AAPL', at: day('2026-09-02'), factor: 4 }]);
        expect(vendor.asked).toEqual([
            ['AAPL', '2026-09-02'],
            ['AAPL', '1960-01-01'],
        ]);
        expect(db.current.of('OHCLVData').writes[0]?.args[0]).toEqual({ tickerID: 'AAPL' });
        expect(insertedInto('OHCLVData')).toMatchObject([{ close: 100 }, { close: 100 }]);
        expect(weeks.rebuilt).toEqual(['AAPL']);
    });

    it('counts a symbol the vendor refuses and carries on with the rest', async () => {
        universe.symbols = ['GONE', 'AAPL'];
        vendor.failing = new Set(['GONE']);
        vendor.history = { AAPL: [row('2026-09-04')] };

        await expect(backfill(NOW)).resolves.toMatchObject({ symbols: 2, failed: 1, filled: 1, written: 1 });
    });

    it('stops at the request limit once the batch it has is written, and asks for no later batch', async () => {
        universe.symbols = Array.from({ length: 150 }, (_unused, index) => `S${String(index).padStart(3, '0')}`);
        vendor.limitedFrom = 'S050';
        vendor.history = { S000: [row('2026-09-04')] };

        await expect(backfill(NOW)).rejects.toThrow('request limit');
        expect(insertedInto('OHCLVData')).toMatchObject([{ tickerID: 'S000' }]);
        expect(vendor.asked.map(([symbol]) => symbol)).not.toContain('S100');
    });
});
