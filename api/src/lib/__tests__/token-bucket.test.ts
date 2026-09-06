import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRedis, type RedisStub } from '@/__tests__/support/redis.js';

const redis: { current: RedisStub } = { current: fakeRedis() };
const logged: { warnings: unknown[] } = { warnings: [] };

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

const { bucketKey, consumeTokenBucket } = await import('@/lib/token-bucket.js');

const OPTIONS = { capacity: 100, refillPerMs: 100 / 60_000 };

beforeEach(() => {
    redis.current = fakeRedis();
    logged.warnings = [];
});

describe('consumeTokenBucket', () => {
    it("reads the script's three-value answer as allowed, remaining and retry-after", async () => {
        redis.current.eval.mockResolvedValueOnce([1, 42, 0]);
        await expect(consumeTokenBucket('rl:strict:ip:1.2.3.4', OPTIONS)).resolves.toEqual({
            allowed: true,
            remaining: 42,
            retryAfterMs: 0,
        });
    });

    it('reports a refusal with how long until the bucket refills', async () => {
        redis.current.eval.mockResolvedValueOnce([0, 0, 1_500]);
        await expect(consumeTokenBucket('rl:strict:ip:1.2.3.4', OPTIONS)).resolves.toEqual({
            allowed: false,
            remaining: 0,
            retryAfterMs: 1_500,
        });
    });

    it('runs one atomic script against exactly one key', async () => {
        await consumeTokenBucket('rl:strict:u:abc', OPTIONS);
        const [script, keyCount, key] = redis.current.eval.mock.calls[0] ?? [];
        expect(typeof script).toBe('string');
        expect(keyCount).toBe(1);
        expect(key).toBe('rl:strict:u:abc');
    });

    it('passes the capacity, refill rate, clock, cost and a ttl', async () => {
        const before = Date.now();
        await consumeTokenBucket('rl:strict:u:abc', OPTIONS, 5);
        const [, , , capacity, refill, now, cost, ttl] = redis.current.eval.mock.calls[0] ?? [];

        expect(capacity).toBe(OPTIONS.capacity);
        expect(refill).toBe(OPTIONS.refillPerMs);
        expect(now).toBeGreaterThanOrEqual(before);
        expect(cost).toBe(5);
        expect(ttl).toBeGreaterThan(OPTIONS.capacity / OPTIONS.refillPerMs);
    });

    it('costs one token unless the caller says otherwise', async () => {
        await consumeTokenBucket('rl:strict:u:abc', OPTIONS);
        expect(redis.current.eval.mock.calls[0]?.[6]).toBe(1);
    });

    it('fails open on a Redis error — locking everyone out is the worse failure', async () => {
        redis.current.breakAll();
        await expect(consumeTokenBucket('rl:strict:u:abc', OPTIONS)).resolves.toEqual({
            allowed: true,
            remaining: 0,
            retryAfterMs: 0,
        });
    });

    it('keeps the outage visible rather than silently relaxing the limit', async () => {
        redis.current.breakAll();
        await consumeTokenBucket('rl:strict:u:abc', OPTIONS);
        expect(logged.warnings).toHaveLength(1);
    });
});

describe('bucketKey', () => {
    it('joins the tier prefix to the identity', () => {
        expect(bucketKey('rl:strict:', 'u:abc')).toBe('rl:strict:u:abc');
    });

    it('keeps two tiers of the same identity in different buckets', () => {
        expect(bucketKey('rl:strict:', 'u:abc')).not.toBe(bucketKey('rl:standard:', 'u:abc'));
    });
});
