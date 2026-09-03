/**
 * Redis clients — the trade stream in, the aggregated feed out.
 * Two connections, because a client that is blocked in XREADGROUP cannot
 * publish: the read holds the connection for up to `blockMs` at a time, and a
 * publish queued behind it would be delayed by exactly as long as the market
 * was quiet. Splitting them costs one socket and removes the coupling.
 */
import { Redis } from 'ioredis';
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

let consumer: Redis | null = null;
let publisher: Redis | null = null;

/** The connection that reads the trade stream. Blocks, so nothing else may use it. */
export function getConsumer(): Redis {
    consumer ??= connect('consumer');
    return consumer;
}

/** The connection that publishes aggregated candles and writes last-value keys. */
export function getPublisher(): Redis {
    publisher ??= connect('publisher');
    return publisher;
}

export async function closeRedis(): Promise<void> {
    const open = [consumer, publisher].filter((client): client is Redis => client !== null);
    consumer = null;
    publisher = null;
    await Promise.allSettled(open.map((client) => client.quit()));
}

function connect(role: string): Redis {
    // `maxRetriesPerRequest: null` because a blocking read is not a request that
    // should be given up on: ioredis would otherwise abort it as a timeout.
    const client = new Redis({ host: config.redis.host, port: config.redis.port, maxRetriesPerRequest: null });
    client.on('error', (err) => logger.error({ err, role }, 'Redis client error'));
    return client;
}
