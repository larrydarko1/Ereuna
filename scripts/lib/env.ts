/**
 * The one loader for the database connection every operational script uses —
 * `backup`, `restore` and the migrate-mongo CLI. Two loaders would mean two
 * precedence rules, and then a backup and the migration it was taken before can
 * quietly target two different databases.
 * It reads `db/.env` and nothing else, and has no dependency outside Node: the
 * migrate CLI loads it too, in places where the dev toolchain is not installed.
 */
import { fileURLToPath } from 'node:url';

type DbConfig = { mongoUri: string; mongoDb: string };

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const ENV_FILE = new URL('../../db/.env', import.meta.url);

/** Load `db/.env` when there is one. A variable already in the environment wins. */
export function loadEnv(): void {
    try {
        process.loadEnvFile(ENV_FILE);
    } catch (err) {
        // No file means the values come from the environment instead, which is
        // how a container runs this; a file that will not parse is still an error
        if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) throw err;
    }
}

export function getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (value === undefined || value === '') {
        throw new Error(
            `${name} is not set. Copy db/.env.example to db/.env, or export it.\n` +
                '  This script refuses to guess a default — a wrong database is worse than no run.',
        );
    }
    return value;
}

export function optionalEnv(name: string, fallback: string): string {
    const value = process.env[name];
    return value === undefined || value === '' ? fallback : value;
}

export function dbConfig(): DbConfig {
    loadEnv();
    return { mongoUri: getRequiredEnv('MONGO_URI'), mongoDb: getRequiredEnv('MONGO_DB') };
}
