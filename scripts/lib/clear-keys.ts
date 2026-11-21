/** Deleting the Redis keys an operational script owns, by name, never with a flush. */
import type { Redis } from 'ioredis';

// `userKey` and `marketKey` in api/src/lib/cache.ts: the answers the API cached
// about the database, so they go whenever the database is replaced
export const CACHE_PATTERNS = ['u:*', 'm:*'];

/** A SCAN page at a time, so a large keyspace never blocks the server the way KEYS would. */
export async function clearKeys(redis: Redis, patterns: readonly string[]): Promise<number> {
    let cleared = 0;

    for (const pattern of patterns) {
        let cursor = '0';
        do {
            const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
            if (keys.length > 0) cleared += await redis.del(...keys);
            cursor = next;
        } while (cursor !== '0');
    }

    return cleared;
}
