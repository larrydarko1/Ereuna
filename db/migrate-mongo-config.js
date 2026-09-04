/**
 * Configuration for the migrate-mongo CLI.
 * Docs: https://github.com/seppevs/migrate-mongo
 * The connection is read from db/.env rather than shared with the API's config
 * module: this file runs under the CLI, outside any workspace's build, and the
 * one thing a migration must never do is quietly target a different database
 * from the one the operator meant.
 */
const ENV_FILE = new URL('.env', import.meta.url);

try {
    process.loadEnvFile(ENV_FILE);
} catch {
    // No db/.env — the values are expected to come from the environment
    // instead, which is how a container runs this.
}

function requireEnv(name) {
    const value = process.env[name];
    if (value === undefined || value === '') {
        throw new Error(`${name} is not set. Copy db/.env.example to db/.env, or export it.`);
    }
    return value;
}

const config = {
    mongodb: {
        url: requireEnv('MONGO_URI'),
        databaseName: requireEnv('MONGO_DB'),
        options: {},
    },
    migrationsDir: 'migrations',
    changelogCollectionName: 'changelog',
    migrationFileExtension: '.js',
    lockCollectionName: 'changelog_lock',
    lockTtl: 0, // 0 disables the lock TTL — a crashed migration must be cleared deliberately
    // False on purpose: content hashing would let an edited migration silently
    // re-run at deploy. Immutability is enforced by db:check instead, which
    // fails the build rather than changing what runs.
    useFileHash: false,
    moduleSystem: 'esm',
};

// `export const config` breaks the CLI — it reads the default export.
/** @public — loaded by the migrate-mongo CLI, never imported. */
export default config;
