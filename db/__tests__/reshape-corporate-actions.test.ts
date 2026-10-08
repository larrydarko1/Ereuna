import { beforeEach, describe, expect, it } from 'vitest';
import { getDocuments, mockDb, resetAll, seedCollection } from './mock-db.js';

const migration = await import('../migrations/20261008000000-reshape-corporate-actions.js');

beforeEach(resetAll);

describe('reshape-corporate-actions', () => {
    it('renames the vendor fields and stores the date as YYYY-MM-DD', async () => {
        seedCollection('AssetInfo', [
            {
                _id: 1,
                Symbol: 'AAPL',
                dividends: [{ payment_date: new Date('2025-05-12T00:00:00Z'), amount: 0.26 }],
                splits: [{ effective_date: new Date('2020-08-31T00:00:00Z'), split_factor: 4 }],
            },
        ]);

        await migration.up(mockDb);

        expect(getDocuments('AssetInfo')).toEqual([
            {
                _id: 1,
                Symbol: 'AAPL',
                dividends: [{ date: '2025-05-12', amount: 0.26 }],
                splits: [{ date: '2020-08-31', ratio: 4 }],
            },
        ]);
    });

    it('sorts each array ascending, which is the order the chart reads it in', async () => {
        seedCollection('AssetInfo', [
            {
                _id: 1,
                Symbol: 'BLK',
                dividends: [
                    { payment_date: new Date('2025-12-23T00:00:00Z'), amount: 5.21 },
                    { payment_date: new Date('2025-03-24T00:00:00Z'), amount: 5.1 },
                ],
            },
        ]);

        await migration.up(mockDb);

        expect(getDocuments('AssetInfo')?.[0]?.dividends).toEqual([
            { date: '2025-03-24', amount: 5.1 },
            { date: '2025-12-23', amount: 5.21 },
        ]);
    });

    it('keeps one row per date, so a replay never pays a dividend twice', async () => {
        seedCollection('AssetInfo', [
            {
                _id: 1,
                Symbol: 'ABCB',
                dividends: [
                    { payment_date: new Date('2025-12-31T00:00:00Z'), amount: 0.2 },
                    { payment_date: new Date('2025-12-31T00:00:00Z'), amount: 0.2 },
                ],
            },
        ]);

        await migration.up(mockDb);

        expect(getDocuments('AssetInfo')?.[0]?.dividends).toEqual([{ date: '2025-12-31', amount: 0.2 }]);
    });

    it('keeps a row the nightly run already wrote in the new shape', async () => {
        seedCollection('AssetInfo', [
            {
                _id: 1,
                Symbol: 'PEP',
                dividends: [
                    { payment_date: new Date('2025-09-30T00:00:00Z'), amount: 1.42 },
                    { date: '2026-01-06', amount: 1.42 },
                    { date: '2025-09-30', amount: 1.42 },
                ],
            },
        ]);

        await migration.up(mockDb);

        expect(getDocuments('AssetInfo')?.[0]?.dividends).toEqual([
            { date: '2025-09-30', amount: 1.42 },
            { date: '2026-01-06', amount: 1.42 },
        ]);
    });

    it('leaves an asset with no corporate actions without the fields', async () => {
        seedCollection('AssetInfo', [
            { _id: 1, Symbol: 'TSLA', splits: [{ effective_date: new Date('2022-08-25T00:00:00Z'), split_factor: 3 }] },
            { _id: 2, Symbol: 'SPY' },
        ]);

        await migration.up(mockDb);

        expect(getDocuments('AssetInfo')).toEqual([
            { _id: 1, Symbol: 'TSLA', splits: [{ date: '2022-08-25', ratio: 3 }] },
            { _id: 2, Symbol: 'SPY' },
        ]);
    });

    it('touches nothing on a second run or on a database already in the new shape', async () => {
        seedCollection('AssetInfo', [
            { _id: 1, Symbol: 'MSFT', dividends: [{ payment_date: new Date('2025-09-11T00:00:00Z'), amount: 0.91 }] },
            { _id: 2, Symbol: 'KO', dividends: [{ date: '2025-10-01', amount: 0.51 }] },
        ]);

        await migration.up(mockDb);
        const first = structuredClone(getDocuments('AssetInfo'));
        await migration.up(mockDb);

        expect(getDocuments('AssetInfo')).toEqual(first);
        expect(getDocuments('AssetInfo')?.[1]).toEqual({ _id: 2, Symbol: 'KO', dividends: [{ date: '2025-10-01', amount: 0.51 }] });
    });

    it('does nothing when there is no AssetInfo collection', async () => {
        await expect(migration.up(mockDb)).resolves.toBeUndefined();
        expect(getDocuments('AssetInfo')).toBeUndefined();
    });
});
