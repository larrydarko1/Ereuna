import Redis from 'ioredis';
import logger from './logger.js';

/**
 * Redis Cache Utility
 * Provides caching layer with automatic fallback and smart TTL management
 */

let redisClient: Redis | null = null;
let isRedisAvailable = false;

// Initialize Redis connection
function initializeRedis(): Redis | null {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) {
                    logger.warn('Redis connection failed after 3 retries, falling back to no-cache mode');
                    return null; // Stop retrying
                }
                return Math.min(times * 100, 2000); // Exponential backoff
            },
            lazyConnect: true, // Don't connect until first command
        });

        client.on('connect', () => {
            logger.info('Redis connected successfully');
            isRedisAvailable = true;
        });

        client.on('error', (err) => {
            logger.error(`Redis error: ${err.message}`);
            isRedisAvailable = false;
        });

        client.on('close', () => {
            logger.warn('Redis connection closed');
            isRedisAvailable = false;
        });

        // Attempt initial connection
        client.connect().catch((err) => {
            logger.warn(`Redis initial connection failed: ${err.message}, continuing without cache`);
            isRedisAvailable = false;
        });

        return client;
    } catch (error) {
        logger.error(`Failed to initialize Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
    }
}

// Get or initialize Redis client
function getRedisClient(): Redis | null {
    if (!redisClient) {
        redisClient = initializeRedis();
    }
    return redisClient;
}

/**
 * Check if it's currently US market hours (9:30 AM - 4:00 PM ET)
 * Returns true during market hours on weekdays
 */
export function isMarketHours(): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const dayOfWeek = now.getUTCDay();

    // Market hours: Mon-Fri, 13:30-20:00 UTC (9:30 AM - 4:00 PM ET)
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isWithinHours =
        (utcHour === 13 && utcMinutes >= 30) || // After 1:30 PM UTC
        (utcHour > 13 && utcHour < 20) || // Between 2 PM and 8 PM UTC
        (utcHour === 20 && utcMinutes === 0); // Exactly 8:00 PM UTC

    return isWeekday && isWithinHours;
}

/**
 * Get smart TTL based on data type and market hours
 * @param dataType - Type of data being cached ('price', 'static', 'user')
 * @returns TTL in seconds
 */
export function getSmartTTL(dataType: 'price' | 'static' | 'user'): number {
    const marketOpen = isMarketHours();

    switch (dataType) {
        case 'price':
            // Price data: 60s during market hours, 5min after hours
            return marketOpen ? 60 : 300;
        case 'static':
            // Static data (screener configs, asset metadata): 30min
            return 1800;
        case 'user':
            // User settings: 15min
            return 900;
        default:
            return 300; // Default 5min
    }
}

/**
 * Cache wrapper for async functions with automatic fallback
 * @param key - Cache key
 * @param fetcher - Async function to fetch data if cache miss
 * @param ttl - Time to live in seconds (optional, uses smart TTL if not provided)
 * @param dataType - Type of data for smart TTL calculation
 * @returns Cached or freshly fetched data
 */
export async function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
    dataType: 'price' | 'static' | 'user' = 'price'
): Promise<T> {
    const client = getRedisClient();

    // If Redis unavailable, just fetch from DB
    if (!client || !isRedisAvailable) {
        return fetcher();
    }

    try {
        // Try to get from cache
        const cached = await client.get(key);
        if (cached) {
            logger.debug(`Cache HIT: ${key}`);
            return JSON.parse(cached);
        }

        logger.debug(`Cache MISS: ${key}`);
        // Cache miss - fetch from DB
        const data = await fetcher();

        // Store in cache with TTL
        const finalTTL = ttl ?? getSmartTTL(dataType);
        await client.setex(key, finalTTL, JSON.stringify(data));

        return data;
    } catch (error) {
        // Redis error - fall back to DB
        logger.warn(`Redis cache error for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}, falling back to DB`);
        return fetcher();
    }
}

/**
 * Invalidate cache by key or pattern
 * @param keyOrPattern - Single key or pattern (e.g., 'screener:user123:*')
 */
export async function invalidateCache(keyOrPattern: string): Promise<void> {
    const client = getRedisClient();
    if (!client || !isRedisAvailable) return;

    try {
        if (keyOrPattern.includes('*')) {
            // Pattern-based deletion
            const keys = await client.keys(keyOrPattern);
            if (keys.length > 0) {
                await client.del(...keys);
                logger.info(`Invalidated ${keys.length} cache keys matching: ${keyOrPattern}`);
            }
        } else {
            // Single key deletion
            await client.del(keyOrPattern);
            logger.debug(`Invalidated cache key: ${keyOrPattern}`);
        }
    } catch (error) {
        logger.warn(`Failed to invalidate cache for ${keyOrPattern}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Manually set cache value
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in seconds
 */
export async function setCache<T>(key: string, value: T, ttl: number): Promise<void> {
    const client = getRedisClient();
    if (!client || !isRedisAvailable) return;

    try {
        await client.setex(key, ttl, JSON.stringify(value));
        logger.debug(`Set cache key: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
        logger.warn(`Failed to set cache for ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Manually get cache value
 * @param key - Cache key
 * @returns Cached value or null
 */
export async function getCache<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client || !isRedisAvailable) return null;

    try {
        const cached = await client.get(key);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        logger.warn(`Failed to get cache for ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
    }
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        logger.info('Redis connection closed');
    }
}
