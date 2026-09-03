/**
 * MongoDB connection. One client per process, opened at startup and read
 * through `getDb()` — the ingestor never subscribes to anything before this
 * resolves, because the ticker universe is the first thing it asks for.
 */
import { MongoClient, type Db } from 'mongodb';
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

let client: MongoClient | undefined;
let db: Db | undefined;

export async function connectDb(): Promise<Db> {
    client = new MongoClient(config.mongo.uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    db = client.db(config.mongo.db);
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
