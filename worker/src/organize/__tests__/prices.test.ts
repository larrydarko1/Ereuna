import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VendorMarketBar } from '@/lib/tiingo.js';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const vendor: { rows: VendorMarketBar[] } = { rows: [] };
const logged: { errors: unknown[] } = { errors: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/tiingo.js', () => ({ marketPrices: () => Promise.resolve(vendor.rows) }));
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

const { refetchHistory, updateDailyPrices } = await import('@/organize/prices.js');
const { config } = await import('@/lib/config.js');

type Asset = Awaited<ReturnType<typeof import('@/organize/universe.js').activeUniverse>>[number];

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
    } as VendorMarketBar;
}

const opsOn = (collection: string): Record<string, unknown>[] =>
    db.current.of(collection).writes.flatMap((write) => write.args[0] as Record<string, unknown>[]);

beforeEach(() => {
    db.current = fakeDb();
    vendor.rows = [];
    logged.errors = [];
});

describe('updateDailyPrices', () => {
    it('writes nothing and reports nothing when the vendor returns nothing', async () => {
        await expect(updateDailyPrices([asset('AAPL')])).resolves.toEqual({ written: 0, splits: [], dividends: [] });
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

    it('ignores a row with no ticker at all', async () => {
        vendor.rows = [{ ...row(), ticker: undefined } as unknown as VendorMarketBar];
        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({ written: 0 });
    });

    it('upserts the bar on (tickerID, timestamp), stamped at midnight UTC', async () => {
        vendor.rows = [row()];
        await updateDailyPrices([asset('AAPL')]);

        const [operation] = opsOn('OHCLVData') as {
            updateOne: { filter: Record<string, unknown>; update: { $set: Record<string, unknown> }; upsert: boolean };
        }[];
        expect(operation?.updateOne.upsert).toBe(true);
        expect(operation?.updateOne.filter).toEqual({
            tickerID: 'AAPL',
            timestamp: new Date('2026-09-04T00:00:00.000Z'),
        });
        expect(operation?.updateOne.update.$set).toEqual({
            tickerID: 'AAPL',
            timestamp: new Date('2026-09-04T00:00:00.000Z'),
            open: 100,
            high: 110,
            low: 99,
            close: 105,
            volume: 1_000,
        });
    });

    it('keeps the adjusted prices, which is the whole series it is joining', async () => {
        vendor.rows = [{ ...row(), open: 1, high: 1, low: 1, close: 1, volume: 1 } as unknown as VendorMarketBar];
        await updateDailyPrices([asset('AAPL')]);
        const [operation] = opsOn('OHCLVData') as { updateOne: { update: { $set: { close: number } } } }[];
        expect(operation?.updateOne.update.$set.close).toBe(105);
    });

    it.each([
        ['an unparseable date', { date: 'not a date' }],
        ['a missing adjusted close', { adjClose: undefined }],
        ['a non-numeric adjusted volume', { adjVolume: 'lots' }],
        ['an infinite adjusted high', { adjHigh: Number.POSITIVE_INFINITY }],
    ])('drops a row with %s rather than half-filling the bar', async (_label, overrides) => {
        vendor.rows = [{ ...row(), ...overrides } as unknown as VendorMarketBar];
        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({ written: 0 });
    });

    it('writes a synthetic closing-minute bar at 20:00 UTC, insert-only', async () => {
        vendor.rows = [row()];
        await updateDailyPrices([asset('AAPL')]);

        const [operation] = opsOn('OHCLVData1m') as {
            updateOne: { filter: { timestamp: Date }; update: { $setOnInsert: Record<string, unknown> } };
        }[];
        expect(operation?.updateOne.filter.timestamp).toEqual(new Date('2026-09-04T20:00:00.000Z'));
        expect(operation?.updateOne.update.$setOnInsert).toEqual({
            tickerID: 'AAPL',
            timestamp: new Date('2026-09-04T20:00:00.000Z'),
            open: 105,
            high: 105,
            low: 105,
            close: 105,
            volume: 0,
        });
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

        expect(db.current.of('OHCLVData').writes).toHaveLength(2);
        expect(db.current.of('OHCLVData').writes[0]?.args[1]).toEqual({ ordered: false });
    });

    it('logs a failed batch and finishes the run', async () => {
        vendor.rows = [row()];
        db.current = fakeDb();
        db.current.of('OHCLVData').bulkWrite.mockRejectedValueOnce(new Error('write conflict'));

        await expect(updateDailyPrices([asset('AAPL')])).resolves.toMatchObject({ written: 1 });
        expect(logged.errors).toHaveLength(1);
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
        await expect(
            refetchHistory('AAPL', [row(), { ...row(), adjClose: undefined } as unknown as VendorMarketBar]),
        ).resolves.toBe(1);
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
