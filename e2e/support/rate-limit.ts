import { Redis } from 'ioredis';

export function createRedis(): Redis {
    return new Redis({
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        maxRetriesPerRequest: 2,
        lazyConnect: true,
    });
}

export async function clearRateLimitBuckets(redis: Redis): Promise<number> {
    let cursor = '0';
    let cleared = 0;
    do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', 'rl:*', 'COUNT', 200);
        cursor = next;
        if (keys.length) {
            await redis.del(...keys);
            cleared += keys.length;
        }
    } while (cursor !== '0');
    return cleared;
}
