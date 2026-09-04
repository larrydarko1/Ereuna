import { beforeEach, describe, expect, it } from 'vitest';
import {
    getDocuments,
    getDroppedIndexCalls,
    getIndexNames,
    mockDb,
    resetAll,
    seedCollection,
    seedIndexes,
} from './mock-db.js';

const migration = await import('../migrations/20260904000200-reshape-market-data.js');

beforeEach(resetAll);

describe('reshape-market-data', () => {
    it('renames the vendor field the read path no longer looks for', async () => {
        seedCollection('News', [
            { _id: 1, url: 'a', description: 'stored under the vendor name' },
            { _id: 2, url: 'b', summary: 'already renamed' },
        ]);

        await migration.up(mockDb);

        expect(getDocuments('News')).toEqual([
            { _id: 1, url: 'a', summary: 'stored under the vendor name' },
            { _id: 2, url: 'b', summary: 'already renamed' },
        ]);
    });

    it('keeps the richest document when a symbol is duplicated', async () => {
        // Every real collision is an equity or ETF against a crypto pair whose
        // ticker flattened onto the same string. Field count is what separates
        // the two, so the rule is asserted on it rather than on document order.
        seedCollection('AssetInfo', [
            { _id: 1, Symbol: 'SETH', AssetType: 'Crypto' },
            { _id: 2, Symbol: 'SETH', AssetType: 'ETF', Name: 'ProShares Short Ether ETF', Exchange: 'NYSE' },
            { _id: 3, Symbol: 'AAPL', AssetType: 'Stock' },
        ]);

        await migration.up(mockDb);

        expect(getDocuments('AssetInfo')).toEqual([
            { _id: 2, Symbol: 'SETH', AssetType: 'ETF', Name: 'ProShares Short Ether ETF', Exchange: 'NYSE' },
            { _id: 3, Symbol: 'AAPL', AssetType: 'Stock' },
        ]);
    });

    it('collapses duplicate headlines to one row per url', async () => {
        seedCollection('News', [
            { _id: 1, url: 'https://example.test/a', title: 'One' },
            { _id: 2, url: 'https://example.test/a', title: 'One' },
            { _id: 3, url: 'https://example.test/b', title: 'Two' },
        ]);

        await migration.up(mockDb);

        expect(getDocuments('News')?.map((doc) => doc.url)).toEqual(['https://example.test/a', 'https://example.test/b']);
    });

    it('removes the progress tracker the old code kept among the events', async () => {
        seedCollection('Calendar', [
            { _id: 1, symbol: 'BLK', type: 'Earnings', reportDate: new Date('2026-01-15') },
            { _id: 2, symbols: ['BLK'], pendingUpdates: [] },
        ]);

        await migration.up(mockDb);

        expect(getDocuments('Calendar')?.map((doc) => doc._id)).toEqual([1]);
    });

    it('drops the non-unique index that would block its unique form', async () => {
        seedCollection('AssetInfo', [{ _id: 1, Symbol: 'AAPL' }]);
        seedIndexes('AssetInfo', ['_id_', 'Symbol_1']);

        await migration.up(mockDb);

        expect(getIndexNames('AssetInfo')).toEqual(['_id_']);
    });

    it('does not ask to drop what is not there', async () => {
        // The driver answers a drop of a missing index with success, so
        // "nothing changed" is not evidence — no call may be made at all.
        seedCollection('AssetInfo', [{ _id: 1, Symbol: 'AAPL' }]);
        seedIndexes('AssetInfo', ['_id_']);

        await migration.up(mockDb);

        expect(getDroppedIndexCalls()).toEqual([]);
    });

    it('changes nothing on a second run', async () => {
        seedCollection('News', [{ _id: 1, url: 'a', description: 'x' }]);
        seedCollection('AssetInfo', [{ _id: 1, Symbol: 'SETH', AssetType: 'Crypto' }]);
        seedCollection('Calendar', [{ _id: 1, symbol: 'BLK', type: 'Earnings', reportDate: new Date() }]);

        await migration.up(mockDb);
        const afterFirst = JSON.stringify([getDocuments('News'), getDocuments('AssetInfo'), getDocuments('Calendar')]);
        await migration.up(mockDb);

        expect(JSON.stringify([getDocuments('News'), getDocuments('AssetInfo'), getDocuments('Calendar')])).toBe(afterFirst);
    });

    it('does nothing when the collections are absent', async () => {
        await expect(migration.up(mockDb)).resolves.toBeUndefined();
    });
});
