/**
 * Redis clients — the trade stream in, the aggregated feed out.
 * Two connections, because a client that is blocked in XREADGROUP cannot
 * publish: the read holds the connection for up to `blockMs` at a time, and a
 * publish queued behind it would be delayed by exactly as long as the market
 * was quiet. Splitting them costs one socket and removes the coupling.
 */
import { Redis } from 'ioredis';

import { redisConnection } from '@ereuna/shared/service/connections';

import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

// `maxRetriesPerRequest: null` on both because a blocking read is not a request
// that should be given up on: ioredis would otherwise abort it as a timeout
const OPTIONS = { ...config.redis, maxRetriesPerRequest: null };

const consumer = redisConnection(Redis, OPTIONS, logger, 'consumer');
const publisher = redisConnection(Redis, OPTIONS, logger, 'publisher');

/** The connection that reads the trade stream. Blocks, so nothing else may use it. */
export const getConsumer = consumer.get;

/** The connection that publishes aggregated candles and writes last-value keys. */
export const getPublisher = publisher.get;

export async function closeRedis(): Promise<void> {
    await Promise.allSettled([consumer.close(), publisher.close()]);
}
