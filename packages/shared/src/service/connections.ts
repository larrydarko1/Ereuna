/**
 * The connection lifecycle every Ereuna process repeats — one MongoDB client
 * and lazily opened Redis clients, each held as module state behind a getter.
 * The drivers are imported as types only: this package must not depend on them
 * at runtime, so each workspace passes in the driver class it installed itself,
 * and calls this once per process from its own lib/db.ts or lib/redis.ts.
 * Not in the package barrel: the barrel is consumed by the browser build.
 */
import type { Redis } from 'ioredis';
import type { Db, MongoClient } from 'mongodb';
import type { Logger } from 'pino';

export type MongoConnection = {
    connect: () => Promise<Db>;
    get: () => Db;
    close: () => Promise<void>;
};

export type RedisConnection = {
    get: () => Redis;
    close: () => Promise<void>;
};

/** The options Ereuna sets. `maxRetriesPerRequest` has no default here: fail-fast or never-give-up is each caller's decision. */
export type RedisSettings = {
    host: string;
    port: number;
    maxRetriesPerRequest: number | null;
    lazyConnect?: boolean;
};

/** Long enough for a replica set election, short enough that a wrong URI fails the boot rather than hanging it. */
const SERVER_SELECTION_TIMEOUT_MS = 5000;

/** Nothing is opened until `connect`, and `get` throws until it has resolved — no caller can reach a half-open client. */
export function mongoConnection(
    driver: typeof MongoClient,
    settings: { uri: string; db: string },
    logger: Logger,
): MongoConnection {
    let client: MongoClient | undefined;
    let db: Db | undefined;

    return {
        connect: async (): Promise<Db> => {
            client = new driver(settings.uri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
            await client.connect();
            db = client.db(settings.db);
            logger.info({ db: settings.db }, 'MongoDB connected');
            return db;
        },
        get: (): Db => {
            if (db === undefined) throw new Error('DB not initialised — call connectDb() first');
            return db;
        },
        close: async (): Promise<void> => {
            if (client !== undefined) await client.close();
        },
    };
}

/**
 * Opened on first use. The error listener is attached here, once, because an
 * ioredis client with no 'error' listener throws an unhandled exception and
 * takes the process down; with one, ioredis logs and reconnects on its own.
 */
export function redisConnection(
    driver: typeof Redis,
    options: RedisSettings,
    logger: Logger,
    role?: string,
): RedisConnection {
    let client: Redis | null = null;

    return {
        get: (): Redis => {
            if (client === null) {
                client = new driver(options);
                client.on('error', (err) => logger.error({ err, role }, 'Redis client error'));
            }
            return client;
        },
        close: async (): Promise<void> => {
            const current = client;
            client = null;
            if (current !== null) await current.quit();
        },
    };
}
