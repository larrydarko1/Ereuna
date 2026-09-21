/**
 * Redis client — the only thing this service writes to.
 * Unlike the API's, this one does not fail open: Redis is the entire output of
 * the ingestor, so a connection it cannot reach means every message it receives
 * is discarded. The error is logged and the process keeps its upstream socket,
 * because ioredis reconnects on its own and the alternative is dropping the
 * Tiingo subscription over a transient blip.
 */
import { Redis } from 'ioredis';
import { redisConnection } from '@ereuna/shared/service/connections';
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

export const { get: getRedis, close: closeRedis } = redisConnection(
    Redis,
    { ...config.redis, maxRetriesPerRequest: null },
    logger,
);
