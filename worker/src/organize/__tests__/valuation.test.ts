import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnyBulkWriteOperation } from 'mongodb';
import type { AssetInfoDoc } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const state: { written: AnyBulkWriteOperation<AssetInfoDoc>[] } = { written: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));
vi.mock('@/organize/write.js', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/organize/write.js')>();
    return {
        setOn: original.setOn,
        writeAssetInfo: (operations: AnyBulkWriteOperation<AssetInfoDoc>[]) => {
            state.written = operations;
            return Promise.resolve();
        },
    };
});

const { updateValuations } = await import('@/organize/valuation.js');

const NOW = new Date('2026-09-05T00:00:00.000Z');

function quarter(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        fiscalDateEnding: new Date('2026-06-30T00:00:00.000Z'),
        reportedEPS: 5,
        totalRevenue: 10_000,
        netIncome: 1_000,
        bookVal: 2_000,
        debt: 500,
        cashAndEq: 300,
        ...overrides,
    };
}

function doc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        Symbol: 'AAPL',
        TimeSeries: { close: 50 },
        SharesOutstanding: 100,
        quarterlyFinancials: [quarter()],
        dividends: [],
        splits: [],
        ...overrides,
    };
}

async function fieldsFor(overrides: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    db.current = fakeDb({ AssetInfo: [doc(overrides)] });
    await updateValuations(NOW);
    const [operation] = state.written as { updateOne: { update: { $set: Record<string, unknown> } } }[];
    return operation?.updateOne.update.$set ?? {};
}

beforeEach(() => {
    db.current = fakeDb();
    state.written = [];
});

describe('updateValuations', () => {
    it('reads only assets that are not delisted', async () => {
        db.current = fakeDb({ AssetInfo: [] });
        await updateValuations(NOW);
        expect(db.current.of('AssetInfo').filters[0]).toEqual({ Delisted: { $ne: true } });
    });

    it('counts and writes one operation per asset', async () => {
        db.current = fakeDb({ AssetInfo: [doc({ Symbol: 'A' }), doc({ Symbol: 'B' })] });
        await expect(updateValuations(NOW)).resolves.toBe(2);
        expect(state.written).toHaveLength(2);
    });

    it('writes nothing for an empty collection', async () => {
        db.current = fakeDb({ AssetInfo: [] });
        await expect(updateValuations(NOW)).resolves.toBe(0);
        expect(state.written).toEqual([]);
    });

    it('defaults `now` to the current clock', async () => {
        db.current = fakeDb({ AssetInfo: [doc()] });
        await expect(updateValuations()).resolves.toBe(1);
    });
});

describe('the ratios', () => {
    it('divides the price by the reported EPS', async () => {
        expect((await fieldsFor()).PERatio).toBe(10);
    });

    it('divides the price by book value per share', async () => {
        expect((await fieldsFor()).PriceToBookRatio).toBe(2.5);
    });

    it('divides the price by revenue per share', async () => {
        expect((await fieldsFor()).PriceToSalesRatioTTM).toBe(0.5);
    });

    it.each([
        ['a zero denominator', { reportedEPS: 0 }],
        ['a negative denominator', { reportedEPS: -5 }],
    ])('reports no ratio for %s', async (_label, overrides) => {
        expect((await fieldsFor({ quarterlyFinancials: [quarter(overrides)] })).PERatio).toBeNull();
    });

    it('reports no ratio without a price', async () => {
        expect((await fieldsFor({ TimeSeries: undefined })).PERatio).toBeNull();
    });

    it('reports no per-share ratio without a share count', async () => {
        expect((await fieldsFor({ SharesOutstanding: null })).PriceToBookRatio).toBeNull();
    });

    it('reports nothing at all when the asset has no filings', async () => {
        const fields = await fieldsFor({ quarterlyFinancials: [] });
        expect(fields).toMatchObject({ PERatio: null, EV: null, PEGRatio: null });
    });

    it('ignores a quarterlyFinancials that is not an array', async () => {
        expect((await fieldsFor({ quarterlyFinancials: 'nope' })).PERatio).toBeNull();
    });
});

describe('the PEG ratio', () => {
    it('divides the multiple by the growth rate in percentage points', async () => {
        const fields = await fieldsFor({
            quarterlyFinancials: [quarter({ reportedEPS: 5 }), quarter({ reportedEPS: 4 })],
        });
        // P/E 10 over 25% growth
        expect(fields.PEGRatio).toBe(0.4);
    });

    it.each([
        ['earnings shrank', 4],
        ['earnings were flat', 5],
    ])(
        'reports nothing when %s — a negative PEG sorts as the cheapest thing on the screen',
        async (_label, current) => {
            const fields = await fieldsFor({
                quarterlyFinancials: [quarter({ reportedEPS: current }), quarter({ reportedEPS: 5 })],
            });
            expect(fields.PEGRatio).toBeNull();
        },
    );

    it('reports nothing against a loss-making prior quarter', async () => {
        const fields = await fieldsFor({
            quarterlyFinancials: [quarter({ reportedEPS: 5 }), quarter({ reportedEPS: -1 })],
        });
        expect(fields.PEGRatio).toBeNull();
    });

    it('reports nothing with only one filing to compare', async () => {
        expect((await fieldsFor()).PEGRatio).toBeNull();
    });
});

describe('enterprise value', () => {
    it('is market cap plus debt less cash', async () => {
        expect((await fieldsFor()).EV).toBe(50 * 100 + 500 - 300);
    });

    it('is unknown without a market capitalisation to start from', async () => {
        expect((await fieldsFor({ SharesOutstanding: null })).EV).toBeNull();
    });

    it.each([
        ['no debt figure', { debt: null }],
        ['no cash figure', { cashAndEq: null }],
    ])('is unknown with %s rather than treating it as zero', async (_label, overrides) => {
        expect((await fieldsFor({ quarterlyFinancials: [quarter(overrides)] })).EV).toBeNull();
    });
});

describe('the dividend yield', () => {
    it('sums the trailing year of payments as a fraction of the price', async () => {
        const fields = await fieldsFor({
            dividends: [
                { date: '2026-06-01', amount: 1 },
                { date: '2026-03-01', amount: 1.5 },
            ],
        });
        expect(fields.DividendYield).toBe(0.05);
    });

    it('ignores a payment older than the trailing year', async () => {
        const fields = await fieldsFor({
            dividends: [
                { date: '2026-06-01', amount: 1 },
                { date: '2020-01-01', amount: 100 },
            ],
        });
        expect(fields.DividendYield).toBe(0.02);
    });

    it('ignores a payment with an unparseable date', async () => {
        const fields = await fieldsFor({ dividends: [{ date: 'whenever', amount: 100 }] });
        expect(fields.DividendYield).toBeNull();
    });

    it('treats a payment with no amount as nothing', async () => {
        expect((await fieldsFor({ dividends: [{ date: '2026-06-01' }] })).DividendYield).toBeNull();
    });

    it('reports nothing for a non-payer rather than zero', async () => {
        expect((await fieldsFor()).DividendYield).toBeNull();
    });

    it.each([
        ['no price', { TimeSeries: undefined }],
        ['a zero price', { TimeSeries: { close: 0 } }],
        ['no dividend array at all', { dividends: undefined }],
    ])('reports nothing with %s', async (_label, overrides) => {
        const fields = await fieldsFor({ dividends: [{ date: '2026-06-01', amount: 1 }], ...overrides });
        expect(fields.DividendYield).toBeNull();
    });
});
