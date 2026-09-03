/**
 * Redis read-through cache.
 * Every entry has a TTL and every operation degrades to a direct fetch when
 * Redis is unreachable — the cache is an optimisation, never a dependency.
 * It caches rendered output, not raw rows, and writes always go to Mongo and
 * invalidate by key rather than updating a second copy.
 */
import { isMarketHours } from '@ereuna/shared';
import { config } from '@/lib/config.js';
import { getRedis } from '@/lib/redis.js';
import { logger } from '@/lib/logger.js';

/**
 * `price` follows the market session; `static` is reference data that changes
 * on an ingest cycle; `user` is per-account state invalidated on write.
 */
export type CachedDataType = 'price' | 'static' | 'user';

export function getSmartTtl(dataType: CachedDataType): number {
    switch (dataType) {
        case 'price':
            return isMarketHours() ? config.cache.priceMarketOpen : config.cache.priceMarketClosed;
        case 'static':
            return config.cache.staticData;
        case 'user':
            return config.cache.userData;
    }
}

/**
 * Read `key` from the cache, or run `fetcher` and store the result.
 * A Redis failure is logged and swallowed: the fetcher still runs, so the
 * request succeeds against the database at full cost rather than failing.
 */
export async function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl?: number; dataType?: CachedDataType } = {},
): Promise<T> {
    const { ttl, dataType = 'price' } = options;

    try {
        const cached = await getRedis().get(key);
        if (cached !== null) return JSON.parse(cached) as T;
    } catch (err) {
        logger.warn({ err, key }, 'Cache read failed — falling through to source');
        return fetcher();
    }

    const data = await fetcher();

    try {
        await getRedis().setex(key, ttl ?? getSmartTtl(dataType), JSON.stringify(data));
    } catch (err) {
        logger.warn({ err, key }, 'Cache write failed — value not cached');
    }

    return data;
}

/** Drop a single key. */
export async function invalidate(key: string): Promise<void> {
    try {
        await getRedis().del(key);
    } catch (err) {
        logger.warn({ err, key }, 'Cache invalidation failed');
    }
}

/**
 * Drop every key under a prefix.
 * Uses SCAN rather than KEYS: `KEYS` walks the entire keyspace in one blocking
 * call, which stalls every other client on the instance for the duration.
 */
export async function invalidatePrefix(prefix: string): Promise<void> {
    try {
        const redis = getRedis();
        let cursor = '0';
        do {
            const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
            cursor = next;
            if (keys.length > 0) await redis.del(...keys);
        } while (cursor !== '0');
    } catch (err) {
        logger.warn({ err, prefix }, 'Cache prefix invalidation failed');
    }
}

/** Cache key for data scoped to one user. */
export function userKey(userId: string, ...parts: string[]): string {
    return `u:${userId}:${parts.join(':')}`;
}

/** Cache key for shared market data. */
export function marketKey(...parts: string[]): string {
    return `m:${parts.join(':')}`;
}
