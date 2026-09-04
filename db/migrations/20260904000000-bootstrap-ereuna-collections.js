/**
 * Bootstrap migration — ensures every collection Ereuna uses exists in a fresh
 * EreunaDB, so that a database created from nothing has the same namespaces as
 * one that has been running for a year.
 * The list is imported, never restated: a second copy of it is the drift this
 * migration would otherwise create.
 */
import { ALL_COLLECTIONS } from '@ereuna/shared/db/indexes';

/** @public — invoked by the migrate-mongo CLI, never imported. */
export async function up(db) {
    for (const name of ALL_COLLECTIONS) {
        await db.createCollection(name).catch((err) => {
            if (err.codeName === 'NamespaceExists' || err.code === 48) return;
            throw err;
        });
    }
    console.log(`  Ensured ${ALL_COLLECTIONS.length} collections exist.`);
}
