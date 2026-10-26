/**
 * Configuration for the migrate-mongo CLI.
 * Docs: https://github.com/seppevs/migrate-mongo
 * The connection comes from the loader every operational script shares —
 * `scripts/lib/env.ts`, which reads db/.env and nothing else — so a backup and
 * the migration it was taken before cannot target two different databases.
 */
import { getRequiredEnv, loadEnv } from '../scripts/lib/env.ts';

loadEnv();

const config = {
    mongodb: {
        url: getRequiredEnv('MONGO_URI'),
        databaseName: getRequiredEnv('MONGO_DB'),
        options: {},
    },
    migrationsDir: 'migrations',
    changelogCollectionName: 'changelog',
    migrationFileExtension: '.js',
    lockCollectionName: 'changelog_lock',
    lockTtl: 0, // 0 disables the lock TTL — a crashed migration must be cleared deliberately
    // False on purpose: content hashing would let an edited migration silently
    // re-run at deploy. Immutability is enforced by the db-drift gate instead, which
    // fails the build rather than changing what runs.
    useFileHash: false,
    moduleSystem: 'esm',
};

// `export const config` breaks the CLI — it reads the default export.
/** @public — loaded by the migrate-mongo CLI, never imported. */
export default config;
