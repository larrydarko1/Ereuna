import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/app-error.js';
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

const { assertLoginAllowed, clearLoginFailures, recordLoginFailure, throttleKey } =
    await import('@/services/auth/login-throttle.js');

const KEY = throttleKey('larry');

/** Drive the counter to exactly `n` failures and report the lock's TTL argument. */
async function failTimes(n: number): Promise<number | undefined> {
    for (let count = 1; count <= n; count += 1) {
        redis.current.incr.mockResolvedValueOnce(count);
        // The throttle is stateful; the sequence is the point
        await recordLoginFailure(KEY);
    }
    const last = redis.current.set.mock.calls.at(-1);
    return last?.[3] as number | undefined;
}

beforeEach(() => {
    redis.current = fakeRedis();
    logged.warnings = [];
});

describe('throttleKey', () => {
    it('hashes, so a username never lands in Redis in plaintext', () => {
        expect(throttleKey('larry')).toMatch(/^[0-9a-f]{64}$/);
        expect(throttleKey('larry')).not.toContain('larry');
    });

    it('normalises case and whitespace, so one account is one bucket', () => {
        expect(throttleKey('  LARRY  ')).toBe(throttleKey('larry'));
    });

    it('keys by the submitted name, not a user id — an unknown account has none to key by', () => {
        expect(throttleKey('does-not-exist')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('gives two accounts different buckets', () => {
        expect(throttleKey('larry')).not.toBe(throttleKey('someone'));
    });
});

describe('assertLoginAllowed', () => {
    it('allows an account with no lock', async () => {
        await expect(assertLoginAllowed(KEY)).resolves.toBeUndefined();
    });

    it('refuses a locked account with the shared RATE_LIMITED code', async () => {
        redis.current.store.set(`login:lock:${KEY}`, '1');
        await expect(assertLoginAllowed(KEY)).rejects.toThrow(AppError);

        try {
            await assertLoginAllowed(KEY);
        } catch (err) {
            expect((err as AppError).status).toBe(429);
            expect((err as AppError).code).toBe('RATE_LIMITED');
            expect((err as AppError).securityEvent).toBe(true);
        }
    });

    it('fails open when Redis is unreachable — an outage must not lock everyone out', async () => {
        redis.current.breakAll();
        await expect(assertLoginAllowed(KEY)).resolves.toBeUndefined();
        expect(logged.warnings).toHaveLength(1);
    });
});

describe('recordLoginFailure', () => {
    it('counts the failure and reports which attempt it was', async () => {
        redis.current.incr.mockResolvedValueOnce(1);
        await expect(recordLoginFailure(KEY)).resolves.toBe(1);
        expect(redis.current.incr).toHaveBeenCalledWith(`login:fail:${KEY}`);
    });

    it('expires the counter, so an old failure does not count forever', async () => {
        await recordLoginFailure(KEY);
        expect(redis.current.expire).toHaveBeenCalledWith(`login:fail:${KEY}`, 15 * 60);
    });

    it.each([1, 2, 3, 4])('sets no lock on failure %i', async (count) => {
        redis.current.incr.mockResolvedValueOnce(count);
        await recordLoginFailure(KEY);
        expect(redis.current.set).not.toHaveBeenCalled();
    });

    it.each([
        [5, 2],
        [6, 4],
        [7, 8],
        [8, 16],
        [9, 32],
    ])('locks for %i seconds after failure %i', async (failures, seconds) => {
        redis.current.incr.mockResolvedValueOnce(failures);
        await recordLoginFailure(KEY);
        expect(redis.current.set).toHaveBeenCalledWith(`login:lock:${KEY}`, '1', 'EX', seconds);
    });

    it('escalates to a fifteen-minute lock at ten failures', async () => {
        redis.current.incr.mockResolvedValueOnce(10);
        await recordLoginFailure(KEY);
        expect(redis.current.set).toHaveBeenCalledWith(`login:lock:${KEY}`, '1', 'EX', 15 * 60);
    });

    it('stays at fifteen minutes beyond ten, rather than growing without bound', async () => {
        await expect(failTimes(20)).resolves.toBe(15 * 60);
    });

    it('reports no attempt count and does not throw when Redis is down', async () => {
        redis.current.breakAll();
        await expect(recordLoginFailure(KEY)).resolves.toBe(0);
        expect(logged.warnings).toHaveLength(1);
    });
});

describe('clearLoginFailures', () => {
    it('drops the counter and the lock together', async () => {
        await clearLoginFailures(KEY);
        expect(redis.current.del).toHaveBeenCalledWith(`login:fail:${KEY}`, `login:lock:${KEY}`);
    });

    it('does not throw when Redis is down — a successful login must still complete', async () => {
        redis.current.breakAll();
        await expect(clearLoginFailures(KEY)).resolves.toBeUndefined();
        expect(logged.warnings).toHaveLength(1);
    });
});
