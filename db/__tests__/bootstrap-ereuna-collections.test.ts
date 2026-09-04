import { describe, it, expect, beforeEach } from 'vitest';
import { ALL_COLLECTIONS } from '@ereuna/shared';
import { mockDb, resetAll, getCreatedIndexes } from './mock-db';
import * as migration from '../migrations/20260904000000-bootstrap-ereuna-collections.js';

describe('bootstrap-ereuna-collections migration', () => {
    beforeEach(() => {
        resetAll();
    });

    describe('up', () => {
        it('creates every collection in the registry', async () => {
            await migration.up(mockDb);

            const created = mockDb.createCollection.mock.calls.map((call: string[]) => call[0]);
            expect(new Set(created)).toEqual(new Set(ALL_COLLECTIONS));
        });

        it('creates no indexes — those live in the manifest', async () => {
            await migration.up(mockDb);

            for (const name of ALL_COLLECTIONS) {
                expect(getCreatedIndexes(name), `${name} should have no migration-created index`).toHaveLength(0);
            }
        });

        it('is idempotent — a second run does not throw on the collections it already made', async () => {
            await migration.up(mockDb);
            await expect(migration.up(mockDb)).resolves.not.toThrow();
        });
    });
});
