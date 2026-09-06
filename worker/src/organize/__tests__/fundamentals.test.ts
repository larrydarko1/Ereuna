import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnyBulkWriteOperation } from 'mongodb';
import type { AssetInfoDoc } from '@ereuna/shared';
import type { VendorStatement } from '@/lib/tiingo.js';
import type { Asset } from '@/organize/universe.js';
import type { Statement } from '@/organize/fundamentals.js';

const vendor: { bySymbol: Map<string, VendorStatement[] | Error> } = { bySymbol: new Map() };
const state: { written: AnyBulkWriteOperation<AssetInfoDoc>[] } = { written: [] };

vi.mock('@/lib/tiingo.js', () => ({
    statements: (symbol: string) => {
        const answer = vendor.bySymbol.get(symbol);
        return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer ?? []);
    },
}));
vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));
vi.mock('@/organize/write.js', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/organize/write.js')>();
    return {
        setOn: original.setOn,
        writeAssetInfo: (operations: AnyBulkWriteOperation<AssetInfoDoc>[]) => {
            state.written.push(...operations);
            return Promise.resolve();
        },
    };
});

const { updateFundamentals } = await import('@/organize/fundamentals.js');

function asset(symbol: string, sharesOutstanding: number | null = 1_000): Asset {
    return {
        symbol,
        assetType: 'Stock',
        exchange: 'NASDAQ',
        sector: '',
        industry: '',
        marketCap: null,
        sharesOutstanding,
        ipo: null,
    };
}

/** A vendor filing: `quarter` 0 is an annual report, anything else is a quarter. */
function filing(date: string, quarter: number, income: Record<string, number> = {}): VendorStatement {
    return {
        date,
        quarter,
        statementData: {
            incomeStatement: Object.entries({ eps: 1, revenue: 1_000, netinc: 100, ...income }).map(
                ([dataCode, value]) => ({ dataCode, value }),
            ),
            balanceSheet: [
                { dataCode: 'bookVal', value: 5 },
                { dataCode: 'debt', value: 200 },
            ],
            cashFlow: [{ dataCode: 'freeCashFlow', value: 90 }],
            overview: [{ dataCode: 'cashAndEq', value: 300 }],
        },
    } as VendorStatement;
}

/** The `$set` payload written for one symbol. */
function fieldsFor(symbol: string): Record<string, unknown> {
    const operation = state.written.find(
        (write) => (write as { updateOne: { filter: { Symbol: string } } }).updateOne.filter.Symbol === symbol,
    ) as { updateOne: { update: { $set: Record<string, unknown> } } } | undefined;
    return operation?.updateOne.update.$set ?? {};
}

beforeEach(() => {
    vendor.bySymbol = new Map();
    state.written = [];
});

describe('updateFundamentals', () => {
    it('reports nothing changed for an empty universe', async () => {
        await expect(updateFundamentals([])).resolves.toBe(0);
    });

    it('writes nothing for a symbol the vendor has no statements for', async () => {
        await expect(updateFundamentals([asset('AAPL')])).resolves.toBe(0);
        expect(state.written).toEqual([]);
    });

    it('carries on past a symbol whose fetch threw', async () => {
        vendor.bySymbol.set('BAD', new Error('502'));
        vendor.bySymbol.set('GOOD', [filing('2026-06-30', 2)]);
        await expect(updateFundamentals([asset('BAD'), asset('GOOD')])).resolves.toBe(1);
        expect(fieldsFor('GOOD')).not.toEqual({});
    });

    it('batches the universe rather than holding every statement set at once', async () => {
        const universe = Array.from({ length: 201 }, (_unused, index) => asset(`S${index}`));
        for (const one of universe) vendor.bySymbol.set(one.symbol, [filing('2026-06-30', 2)]);
        await expect(updateFundamentals(universe)).resolves.toBe(201);
    });
});

describe('splitting the filings', () => {
    it('files quarter zero as an annual report and everything else as a quarter', async () => {
        vendor.bySymbol.set('AAPL', [filing('2026-06-30', 2), filing('2025-12-31', 0)]);
        await updateFundamentals([asset('AAPL')]);
        const fields = fieldsFor('AAPL');
        expect((fields.quarterlyFinancials as Statement[]).map((one) => one.fiscalDateEnding)).toEqual([
            new Date('2026-06-30'),
        ]);
        expect((fields.AnnualFinancials as Statement[]).map((one) => one.fiscalDateEnding)).toEqual([
            new Date('2025-12-31'),
        ]);
    });

    it('sorts each list newest first, whatever order the vendor sent', async () => {
        vendor.bySymbol.set('AAPL', [filing('2025-03-31', 1), filing('2026-06-30', 2), filing('2025-12-31', 4)]);
        await updateFundamentals([asset('AAPL')]);
        const dates = (fieldsFor('AAPL').quarterlyFinancials as Statement[]).map((one) =>
            one.fiscalDateEnding.toISOString().slice(0, 10),
        );
        expect(dates).toEqual(['2026-06-30', '2025-12-31', '2025-03-31']);
    });

    it.each([
        ['no date', { date: undefined }],
        ['an unparseable date', { date: 'not a date' }],
    ])('drops a filing with %s', async (_label, overrides) => {
        vendor.bySymbol.set('AAPL', [{ ...filing('2026-06-30', 2), ...overrides } as VendorStatement]);
        await expect(updateFundamentals([asset('AAPL')])).resolves.toBe(0);
    });

    it('flattens all four sections into one object, the way the screener addresses them', async () => {
        vendor.bySymbol.set('AAPL', [filing('2026-06-30', 2)]);
        await updateFundamentals([asset('AAPL')]);
        const [latest] = fieldsFor('AAPL').quarterlyFinancials as Statement[];
        expect(latest).toMatchObject({ bookVal: 5, debt: 200, freeCashFlow: 90, cashAndEq: 300 });
    });

    it('stores a null vendor value as zero rather than leaving the code absent', async () => {
        const nulled = filing('2026-06-30', 2);
        nulled.statementData = {
            balanceSheet: [{ dataCode: 'bookVal', value: null }],
        } as VendorStatement['statementData'];
        vendor.bySymbol.set('AAPL', [nulled]);
        await updateFundamentals([asset('AAPL')]);
        const [latest] = fieldsFor('AAPL').quarterlyFinancials as Statement[];
        expect(latest?.bookVal).toBe(0);
    });

    it('ignores an item with no data code', async () => {
        const anonymous = filing('2026-06-30', 2);
        anonymous.statementData = { balanceSheet: [{ value: 5 }] } as VendorStatement['statementData'];
        vendor.bySymbol.set('AAPL', [anonymous]);
        await updateFundamentals([asset('AAPL')]);
        const [latest] = fieldsFor('AAPL').quarterlyFinancials as Statement[];
        expect(Object.keys(latest ?? {}).sort()).toEqual([
            'fiscalDateEnding',
            'netIncome',
            'reportedEPS',
            'totalRevenue',
        ]);
    });

    it('defaults the three headline figures to zero when the vendor omits them', async () => {
        const bare = filing('2026-06-30', 2);
        bare.statementData = {} as VendorStatement['statementData'];
        vendor.bySymbol.set('AAPL', [bare]);
        await updateFundamentals([asset('AAPL')]);
        const [latest] = fieldsFor('AAPL').quarterlyFinancials as Statement[];
        expect(latest).toMatchObject({ reportedEPS: 0, totalRevenue: 0, netIncome: 0 });
    });
});

describe('the derived figures', () => {
    it('lifts EPS, book value and net cash off the newest quarter', async () => {
        vendor.bySymbol.set('AAPL', [filing('2026-06-30', 2, { eps: 2.5 })]);
        await updateFundamentals([asset('AAPL')]);
        expect(fieldsFor('AAPL')).toMatchObject({ EPS: 2.5, BookValue: 5, NetCash: 100 });
    });

    it("prefers the filing's share count over the reference one", async () => {
        const withShares = filing('2026-06-30', 2);
        withShares.statementData?.overview?.push({ dataCode: 'sharesBasic', value: 42 });
        vendor.bySymbol.set('AAPL', [withShares]);
        await updateFundamentals([asset('AAPL', 1_000)]);
        expect(fieldsFor('AAPL').SharesOutstanding).toBe(42);
    });

    it('falls back to the reference share count when the filing carries none', async () => {
        vendor.bySymbol.set('AAPL', [filing('2026-06-30', 2)]);
        await updateFundamentals([asset('AAPL', 1_000)]);
        expect(fieldsFor('AAPL').SharesOutstanding).toBe(1_000);
    });

    it('writes no share count at all when neither source has one', async () => {
        vendor.bySymbol.set('AAPL', [filing('2026-06-30', 2)]);
        await updateFundamentals([asset('AAPL', null)]);
        expect(fieldsFor('AAPL')).not.toHaveProperty('SharesOutstanding');
    });

    it('compares consecutive filings for quarter-on-quarter growth', async () => {
        vendor.bySymbol.set('AAPL', [filing('2026-06-30', 2, { eps: 2 }), filing('2026-03-31', 1, { eps: 1 })]);
        await updateFundamentals([asset('AAPL')]);
        expect(fieldsFor('AAPL').EPSQoQ).toBe(1);
    });

    it('compares against the same quarter a year back for year-on-year growth', async () => {
        vendor.bySymbol.set('AAPL', [
            filing('2026-06-30', 2, { eps: 4 }),
            filing('2026-03-31', 1, { eps: 3 }),
            filing('2025-12-31', 4, { eps: 3 }),
            filing('2025-09-30', 3, { eps: 3 }),
            filing('2025-06-30', 2, { eps: 2 }),
        ]);
        await updateFundamentals([asset('AAPL')]);
        expect(fieldsFor('AAPL').EPSYoY).toBe(1);
    });

    it.each([
        ['a loss in the earlier quarter', -1],
        ['a flat zero in the earlier quarter', 0],
    ])('reports no growth against %s — a percentage out of a loss has no readable sign', async (_label, previous) => {
        vendor.bySymbol.set('AAPL', [
            filing('2026-06-30', 2, { netinc: 100 }),
            filing('2026-03-31', 1, { netinc: previous }),
        ]);
        await updateFundamentals([asset('AAPL')]);
        expect(fieldsFor('AAPL').EarningsQoQ).toBeNull();
    });

    it('reports no growth when there is no earlier filing to compare with', async () => {
        vendor.bySymbol.set('AAPL', [filing('2026-06-30', 2)]);
        await updateFundamentals([asset('AAPL')]);
        expect(fieldsFor('AAPL')).toMatchObject({ EPSQoQ: null, EPSYoY: null, RevYoY: null });
    });

    it('derives nothing from an annual-only filer, but still stores the annuals', async () => {
        vendor.bySymbol.set('AAPL', [filing('2025-12-31', 0)]);
        await updateFundamentals([asset('AAPL')]);
        const fields = fieldsFor('AAPL');
        expect(fields.quarterlyFinancials).toEqual([]);
        expect(fields).not.toHaveProperty('EPS');
    });
});
