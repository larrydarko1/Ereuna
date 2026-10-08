import { beforeEach, describe, expect, it } from 'vitest';
import { getDocuments, mockDb, resetAll, seedCollection } from './mock-db.js';

const migration = await import('../migrations/20261008000100-null-nan-statement-figures.js');

const ending = new Date('2025-06-30T00:00:00Z');

beforeEach(resetAll);

describe('null-nan-statement-figures', () => {
    it('nulls a NaN figure and leaves the rest of the row alone', async () => {
        seedCollection('AssetInfo', [
            {
                _id: 1,
                Symbol: 'CACQ',
                quarterlyFinancials: [{ fiscalDateEnding: ending, currentRatio: Number.NaN, totalRevenue: 0, roe: 0.12 }],
            },
        ]);

        await migration.up(mockDb);

        expect(getDocuments('AssetInfo')?.[0]?.quarterlyFinancials).toEqual([
            { fiscalDateEnding: ending, currentRatio: null, totalRevenue: 0, roe: 0.12 },
        ]);
    });

    it('cleans the annual statements and every period, not only the newest quarter', async () => {
        seedCollection('AssetInfo', [
            {
                _id: 1,
                Symbol: 'LCID',
                quarterlyFinancials: [{ profitMargin: 0.1 }, { profitMargin: Number.NaN }],
                AnnualFinancials: [{ grossMargin: Number.POSITIVE_INFINITY }],
            },
        ]);

        await migration.up(mockDb);

        const [asset] = getDocuments('AssetInfo') ?? [];
        expect(asset?.quarterlyFinancials).toEqual([{ profitMargin: 0.1 }, { profitMargin: null }]);
        expect(asset?.AnnualFinancials).toEqual([{ grossMargin: null }]);
    });

    it('leaves an asset whose statements are already clean as it was', async () => {
        const clean = { _id: 1, Symbol: 'AAPL', quarterlyFinancials: [{ currentRatio: 0.87 }] };
        seedCollection('AssetInfo', [clean, { _id: 2, Symbol: 'SPY' }]);

        await migration.up(mockDb);

        expect(getDocuments('AssetInfo')).toEqual([
            { _id: 1, Symbol: 'AAPL', quarterlyFinancials: [{ currentRatio: 0.87 }] },
            { _id: 2, Symbol: 'SPY' },
        ]);
    });

    it('touches nothing on a second run', async () => {
        seedCollection('AssetInfo', [{ _id: 1, Symbol: 'SONS', quarterlyFinancials: [{ grossMargin: Number.NaN }] }]);

        await migration.up(mockDb);
        const first = structuredClone(getDocuments('AssetInfo'));
        await migration.up(mockDb);

        expect(getDocuments('AssetInfo')).toEqual(first);
    });

    it('does nothing when there is no AssetInfo collection', async () => {
        await expect(migration.up(mockDb)).resolves.toBeUndefined();
        expect(getDocuments('AssetInfo')).toBeUndefined();
    });
});
