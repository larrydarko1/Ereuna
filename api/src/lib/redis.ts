/**
 * redis — lazily-initialised ioredis singleton, shared by the cache, the rate
 * limiter and the login throttle. Every Redis-backed control in this API fails
 * open, so an unreachable cache degrades behaviour rather than breaking it.
 */
import { Redis } from 'ioredis';
import { redisConnection } from '@ereuna/shared/service/connections';
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

export const { get: getRedis, close: closeRedis } = redisConnection(
    Redis,
    { ...config.redis, maxRetriesPerRequest: 3, lazyConnect: true },
    logger,
);
