/** redis — lazily-initialised ioredis singleton, shared by the cache, the rate limiter and the login throttle. */
import { Redis } from 'ioredis';
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

let client: Redis | null = null;

export function getRedis(): Redis {
    if (client === null) {
        client = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
        /**
         * Every Redis-backed control in this API fails open, so an unreachable
         * cache degrades behaviour rather than breaking it. The handler exists
         * because an ioredis client with no 'error' listener throws an
         * unhandled exception and takes the process down instead.
         */
        client.on('error', (err) => logger.error({ err }, 'Redis client error'));
    }
    return client;
}

export async function closeRedis(): Promise<void> {
    if (client !== null) {
        await client.quit();
        client = null;
    }
}
