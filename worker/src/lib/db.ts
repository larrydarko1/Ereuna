/**
 * MongoDB connection. One client per process, opened at startup and read
 * through `getDb()` — every finished candle is written through it, so nothing
 * starts consuming the trade stream before it resolves.
 */
import { MongoClient } from 'mongodb';
import { mongoConnection } from '@ereuna/shared/service/connections';
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

export const { connect: connectDb, get: getDb, close: closeDb } = mongoConnection(MongoClient, config.mongo, logger);
