import { describe, it, expect, beforeEach } from 'vitest';
import { mockDb, resetAll, seedCollection, getDocuments, getDroppedCollections } from './mock-db';
import * as migration from '../migrations/20260906000000-drop-news-and-calendar.js';

describe('drop-news-and-calendar migration', () => {
    beforeEach(() => {
        resetAll();
    });

    describe('up', () => {
        it('drops the two namespaces nothing writes or reads any more', async () => {
            seedCollection('News', [{ url: 'https://example.test/a' }]);
            seedCollection('Calendar', [{ symbol: 'AAPL', type: 'Earnings' }]);

            await migration.up(mockDb);

            expect(new Set(getDroppedCollections())).toEqual(new Set(['News', 'Calendar']));
        });

        it('clears IntrinsicValue and leaves every other asset field alone', async () => {
            seedCollection('AssetInfo', [
                { Symbol: 'AAPL', IntrinsicValue: 210.5, PERatio: 28 },
                { Symbol: 'MSFT', PERatio: 33 },
            ]);

            await migration.up(mockDb);

            expect(getDocuments('AssetInfo')).toEqual([
                { Symbol: 'AAPL', PERatio: 28 },
                { Symbol: 'MSFT', PERatio: 33 },
            ]);
        });

        it('clears the two valuation lists off the market stats document', async () => {
            seedCollection('Stats', [
                { _id: 'marketStats', top10Undervalued: [{ symbol: 'AAPL' }], top10Overvalued: [], sectorTierList: [] },
                { _id: 'Holidays', Holidays: [{ date: '2026-01-01', name: "New Year's Day" }] },
            ]);

            await migration.up(mockDb);

            expect(getDocuments('Stats')).toEqual([
                { _id: 'marketStats', sectorTierList: [] },
                { _id: 'Holidays', Holidays: [{ date: '2026-01-01', name: "New Year's Day" }] },
            ]);
        });

        it('is a no-op against a database that never held any of it', async () => {
            seedCollection('AssetInfo', [{ Symbol: 'AAPL', PERatio: 28 }]);
            seedCollection('Stats', [{ _id: 'marketStats', sectorTierList: [] }]);

            await migration.up(mockDb);

            expect(getDroppedCollections()).toEqual([]);
            expect(getDocuments('AssetInfo')).toEqual([{ Symbol: 'AAPL', PERatio: 28 }]);
            expect(getDocuments('Stats')).toEqual([{ _id: 'marketStats', sectorTierList: [] }]);
        });
    });

    it('exports no down() — the rows it removes are gone', () => {
        expect((migration as Record<string, unknown>).down).toBeUndefined();
    });
});
