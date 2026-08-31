/**
 * MongoDB connection module.
 * One singleton connection per process: `connectDb()` runs once at startup and
 * caches the Db handle; every other module reads it through `getDb()`. The
 * server does not bind a port until this resolves, so no request can arrive
 * before the connection exists.
 */
import { MongoClient, type Db } from 'mongodb';
import { INDEXES } from '@ereuna/shared';
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

let client: MongoClient | undefined;
let db: Db | undefined;

export async function connectDb(): Promise<Db> {
    client = new MongoClient(config.mongo.uri, {
        serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db(config.mongo.db);

    await ensureIndexes(db);

    logger.info({ db: config.mongo.db }, 'MongoDB connected');
    return db;
}

export function getDb(): Db {
    if (db === undefined) throw new Error('DB not initialised — call connectDb() first');
    return db;
}

export async function closeDb(): Promise<void> {
    if (client !== undefined) await client.close();
}

/**
 * Apply the index manifest from the shared package. Idempotent: `createIndex`
 * is a no-op when an index with the same keys and options already exists, so
 * replicas racing each other at boot is harmless. This only ever creates —
 * dropping an index is a migration, because a drop applied here would re-run
 * on every restart of every replica.
 */
async function ensureIndexes(target: Db): Promise<void> {
    await Promise.all(
        INDEXES.map(({ collection, keys, options }) => target.collection(collection).createIndex(keys, options ?? {})),
    );
    logger.info({ count: INDEXES.length }, 'MongoDB indexes ensured');
}
