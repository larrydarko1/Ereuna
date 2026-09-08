import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRedis, type RedisStub } from '@/__tests__/support/redis.js';

const redis: { current: RedisStub } = { current: fakeRedis() };
const clock: { open: boolean } = { open: true };
const logged: { warnings: unknown[] } = { warnings: [] };

vi.mock('@ereuna/shared', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@ereuna/shared')>()),
    isMarketHours: () => clock.open,
}));
vi.mock('@/lib/redis.js', () => ({ getRedis: () => redis.current }));
vi.mock('@/lib/logger.js', () => ({
    logger: {
        warn: (payload: unknown): void => {
            logged.warnings.push(payload);
        },
        info: (): void => {},
        error: (): void => {},
        debug: (): void => {},
    },
}));

const { invalidatePrefix, marketKey, userKey, withCache } = await import('@/lib/cache.js');
const { config } = await import('@/lib/config.js');

beforeEach(() => {
    redis.current = fakeRedis();
    clock.open = true;
    logged.warnings = [];
});

describe('withCache', () => {
    it('runs the fetcher on a miss and stores the rendered result', async () => {
        const fetcher = vi.fn(() => Promise.resolve({ price: 100 }));
        await expect(withCache('m:AAPL', fetcher)).resolves.toEqual({ price: 100 });
        expect(fetcher).toHaveBeenCalledOnce();
        expect(redis.current.store.get('m:AAPL')).toBe('{"price":100}');
    });

    it('answers a hit without touching the source', async () => {
        redis.current.store.set('m:AAPL', '{"price":100}');
        const fetcher = vi.fn(() => Promise.resolve({ price: 999 }));
        await expect(withCache('m:AAPL', fetcher)).resolves.toEqual({ price: 100 });
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('caches a falsy value rather than treating it as a miss', async () => {
        redis.current.store.set('m:count', '0');
        const fetcher = vi.fn(() => Promise.resolve(1));
        await expect(withCache('m:count', fetcher)).resolves.toBe(0);
        expect(fetcher).not.toHaveBeenCalled();
    });

    // A `null` fetcher result is a document the ingestor has not written yet.
    // Storing it made the API answer 404 for the whole TTL after the document
    // finally arrived — a full day, for the holiday calendar.
    it('does not cache an absent value', async () => {
        await expect(withCache('m:stats:Holidays', () => Promise.resolve(null))).resolves.toBeNull();
        expect(redis.current.setex).not.toHaveBeenCalled();
        expect(redis.current.store.has('m:stats:Holidays')).toBe(false);
    });

    it('runs the fetcher again once an absent value has been written', async () => {
        const fetcher = vi.fn<() => Promise<{ ok: boolean } | null>>();
        fetcher.mockResolvedValueOnce(null).mockResolvedValueOnce({ ok: true });

        await expect(withCache('m:stats:Holidays', fetcher)).resolves.toBeNull();
        await expect(withCache('m:stats:Holidays', fetcher)).resolves.toEqual({ ok: true });
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('takes an explicit ttl over the smart one', async () => {
        await withCache('m:AAPL', () => Promise.resolve(1), { ttl: 7 });
        expect(redis.current.setex).toHaveBeenCalledWith('m:AAPL', 7, '1');
    });

    it('holds a price for less time while the market is open', async () => {
        clock.open = true;
        await withCache('m:open', () => Promise.resolve(1));
        clock.open = false;
        await withCache('m:closed', () => Promise.resolve(1));

        expect(redis.current.setex).toHaveBeenNthCalledWith(1, 'm:open', config.cache.priceMarketOpen, '1');
        expect(redis.current.setex).toHaveBeenNthCalledWith(2, 'm:closed', config.cache.priceMarketClosed, '1');
        expect(config.cache.priceMarketOpen).toBeLessThan(config.cache.priceMarketClosed);
    });

    it.each([
        ['static', 'staticData'],
        ['user', 'userData'],
    ] as const)('holds %s data for its own ttl', async (dataType, key) => {
        await withCache('m:x', () => Promise.resolve(1), { dataType });
        expect(redis.current.setex).toHaveBeenCalledWith('m:x', config.cache[key], '1');
    });

    it('falls through to the source when the read fails, and does not then try to write', async () => {
        redis.current.get.mockRejectedValueOnce(new Error('connection refused'));
        const fetcher = vi.fn(() => Promise.resolve(5));
        await expect(withCache('m:x', fetcher)).resolves.toBe(5);
        expect(fetcher).toHaveBeenCalledOnce();
        expect(redis.current.setex).not.toHaveBeenCalled();
        expect(logged.warnings).toHaveLength(1);
    });

    it('still answers when the write fails — the cache is an optimisation, never a dependency', async () => {
        redis.current.setex.mockRejectedValueOnce(new Error('OOM'));
        await expect(withCache('m:x', () => Promise.resolve(5))).resolves.toBe(5);
        expect(logged.warnings).toHaveLength(1);
    });

    it('lets a failing fetcher reject — that is the source failing, not the cache', async () => {
        await expect(withCache('m:x', () => Promise.reject(new Error('mongo down')))).rejects.toThrow('mongo down');
    });
});

describe('invalidatePrefix', () => {
    it('drops every key under the prefix and leaves the rest', async () => {
        redis.current.store.set('u:1:portfolio', 'a');
        redis.current.store.set('u:1:trades', 'b');
        redis.current.store.set('u:2:portfolio', 'c');

        await invalidatePrefix('u:1:');
        expect([...redis.current.store.keys()]).toEqual(['u:2:portfolio']);
    });

    it('scans rather than walking the whole keyspace in one blocking call', async () => {
        await invalidatePrefix('u:1:');
        expect(redis.current.scan).toHaveBeenCalledWith('0', 'MATCH', 'u:1:*', 'COUNT', 200);
    });

    it('deletes nothing when the prefix matched nothing', async () => {
        await invalidatePrefix('u:9:');
        expect(redis.current.del).not.toHaveBeenCalled();
    });

    it('follows the cursor until the scan comes back round to zero', async () => {
        redis.current.scan.mockResolvedValueOnce(['42', ['u:1:a']]).mockResolvedValueOnce(['0', ['u:1:b']]);
        await invalidatePrefix('u:1:');
        expect(redis.current.scan).toHaveBeenCalledTimes(2);
        expect(redis.current.del).toHaveBeenCalledTimes(2);
    });

    it('swallows a Redis failure — a stale entry is not worth failing a write over', async () => {
        redis.current.breakAll();
        await expect(invalidatePrefix('u:1:')).resolves.toBeUndefined();
        expect(logged.warnings).toHaveLength(1);
    });
});

describe('the key builders', () => {
    it("scopes a user key by id, so one account cannot read another's entry", () => {
        expect(userKey('abc', 'portfolio', '0')).toBe('u:abc:portfolio:0');
        expect(userKey('abc', 'x')).not.toBe(userKey('def', 'x'));
    });

    it('keeps shared market data in its own namespace', () => {
        expect(marketKey('quote', 'AAPL')).toBe('m:quote:AAPL');
    });

    it('never lets a market key collide with a user one', () => {
        expect(marketKey('abc', 'x').startsWith('m:')).toBe(true);
        expect(userKey('abc', 'x').startsWith('u:')).toBe(true);
    });
});
