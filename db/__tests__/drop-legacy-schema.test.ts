import { describe, it, expect, beforeEach } from 'vitest';
import {
    mockDb,
    resetAll,
    seedCollection,
    seedIndexes,
    getDocuments,
    getDroppedCollections,
    getDroppedIndexCalls,
    getIndexNames,
} from './mock-db';
import * as migration from '../migrations/20260904000100-drop-legacy-schema.js';

const DEAD_COLLECTIONS = ['Agents', 'Alerts', 'Docs', 'FinancialUpdatesProgress', 'systemSettings'];

describe('drop-legacy-schema migration', () => {
    beforeEach(() => {
        resetAll();
    });

    describe('up', () => {
        it('drops every collection the rebuild removed', async () => {
            for (const name of DEAD_COLLECTIONS) seedCollection(name, [{ _id: '1' }]);

            await migration.up(mockDb);

            expect(new Set(getDroppedCollections())).toEqual(new Set(DEAD_COLLECTIONS));
        });

        it('removes pre-rebuild documents and keeps current ones', async () => {
            seedCollection('Users', [{ Username: 'old' }, { usernameLower: 'new' }]);
            seedCollection('Screeners', [{ UsernameID: 'old' }, { userId: 'new' }]);

            await migration.up(mockDb);

            expect(getDocuments('Users')).toEqual([{ usernameLower: 'new' }]);
            expect(getDocuments('Screeners')).toEqual([{ userId: 'new' }]);
        });

        it('drops the superseded indexes and leaves the manifest ones alone', async () => {
            seedIndexes('AssetInfo', ['idx_delisted_symbol', 'idx_qf_roe', 'Symbol_1']);
            seedIndexes('Users', ['idx_username', 'usernameLower_1']);

            await migration.up(mockDb);

            expect(getIndexNames('AssetInfo')).toEqual(['Symbol_1']);
            expect(getIndexNames('Users')).toEqual(['usernameLower_1']);
        });

        it('is a no-op on a database that only ever held current data', async () => {
            seedCollection('Users', [{ usernameLower: 'new' }]);
            seedIndexes('AssetInfo', ['Symbol_1']);

            await migration.up(mockDb);

            expect(getDocuments('Users')).toEqual([{ usernameLower: 'new' }]);
            expect(getIndexNames('AssetInfo')).toEqual(['Symbol_1']);
        });

        it('does not ask to drop what is not there', async () => {
            // The driver answers a drop of a missing collection or index with
            // success, so "nothing changed" is not evidence: the migration has
            // to have made no call at all, or its log reports work it never did.
            seedCollection('Users', [{ usernameLower: 'new' }]);
            seedIndexes('AssetInfo', ['Symbol_1']);

            await migration.up(mockDb);

            expect(getDroppedCollections()).toEqual([]);
            expect(getDroppedIndexCalls()).toEqual([]);
        });

        it('is idempotent — the second run finds nothing left to remove', async () => {
            seedCollection('Agents', [{ _id: '1' }]);
            seedCollection('Users', [{ Username: 'old' }]);
            seedIndexes('Users', ['idx_username']);

            await migration.up(mockDb);
            await expect(migration.up(mockDb)).resolves.not.toThrow();

            expect(getDocuments('Users')).toEqual([]);
            expect(getIndexNames('Users')).toEqual([]);
        });
    });
});
