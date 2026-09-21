/**
 * MongoDB connection module.
 * One singleton connection per process: `connectDb()` runs once at startup and
 * caches the Db handle; every other module reads it through `getDb()`. The
 * server does not bind a port until this resolves, so no request can arrive
 * before the connection exists.
 */
import { MongoClient, type Db } from 'mongodb';
import { INDEXES } from '@ereuna/shared';
import { mongoConnection } from '@ereuna/shared/service/connections';
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

const connection = mongoConnection(MongoClient, config.mongo, logger);

export const { get: getDb, close: closeDb } = connection;

export async function connectDb(): Promise<Db> {
    const db = await connection.connect();
    await ensureIndexes(db);
    return db;
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
