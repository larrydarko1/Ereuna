/**
 * Redis client — the only thing this service writes to.
 * Unlike the API's, this one does not fail open: Redis is the entire output of
 * the ingestor, so a connection it cannot reach means every message it receives
 * is discarded. The error is logged and the process keeps its upstream socket,
 * because ioredis reconnects on its own and the alternative is dropping the
 * Tiingo subscription over a transient blip.
 */
import { Redis } from 'ioredis';
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

let client: Redis | null = null;

export function getRedis(): Redis {
    if (client === null) {
        client = new Redis({ host: config.redis.host, port: config.redis.port, maxRetriesPerRequest: null });
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
