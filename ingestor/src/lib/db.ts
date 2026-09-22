/**
 * MongoDB connection. One client per process, opened at startup and read
 * through `getDb()` — the ingestor never subscribes to anything before this
 * resolves, because the ticker universe is the first thing it asks for.
 */
import { MongoClient } from 'mongodb';

import { mongoConnection } from '@ereuna/shared/service/connections';

import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

export const { connect: connectDb, get: getDb, close: closeDb } = mongoConnection(MongoClient, config.mongo, logger);
