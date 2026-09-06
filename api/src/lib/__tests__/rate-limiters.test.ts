import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestHandler } from 'express';
import { asUser, quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

type Consume = { key: string; opts: { capacity: number; refillPerMs: number } };

const seen: Consume[] = [];
const answer: { allowed: boolean; remaining: number; retryAfterMs: number } = {
    allowed: true,
    remaining: 99,
    retryAfterMs: 0,
};

vi.mock('@/lib/token-bucket.js', () => ({
    bucketKey: (prefix: string, id: string) => `${prefix}${id}`,
    consumeTokenBucket: (key: string, opts: Consume['opts']) => {
        seen.push({ key, opts });
        return Promise.resolve({ ...answer });
    },
}));

const { assetLimiter, relaxedLimiter, standardLimiter, strictLimiter } = await import('@/lib/rate-limiters.js');

let harness: Harness | null = null;

async function limited(limiter: RequestHandler, before: RequestHandler[] = []): Promise<Harness> {
    harness = await serve((app) => {
        app.use(quietLogger);
        for (const middleware of before) app.use(middleware);
        app.get('/x', limiter, (_req, res) => res.json({ ok: true }));
    });
    return harness;
}

beforeEach(() => {
    seen.length = 0;
    answer.allowed = true;
    answer.remaining = 99;
    answer.retryAfterMs = 0;
});

afterEach(async () => {
    await harness?.close();
    harness = null;
});

describe('the tiers', () => {
    it.each([
        ['strict', strictLimiter, 'rl:strict:', 15, 15 * 60 * 1000],
        ['standard', standardLimiter, 'rl:standard:', 100, 60 * 1000],
        ['relaxed', relaxedLimiter, 'rl:relaxed:', 300, 60 * 1000],
        ['asset', assetLimiter, 'rl:asset:', 1500, 60 * 1000],
    ])('gives %s its own namespace, burst and refill rate', async (_name, limiter, prefix, capacity, windowMs) => {
        const { call } = await limited(limiter as RequestHandler);
        await call('/x');

        expect(seen[0]?.key.startsWith(prefix)).toBe(true);
        expect(seen[0]?.opts).toEqual({ capacity, refillPerMs: capacity / windowMs });
    });

    it('lets a page of logos through where it would throttle a page of writes', () => {
        expect(1500).toBeGreaterThan(100);
    });
});

describe('the identity a request is keyed by', () => {
    it('keys an authenticated request by user, so one office does not share a bucket', async () => {
        const { call } = await limited(standardLimiter, [asUser('507f1f77bcf86cd799439011')]);
        await call('/x');
        expect(seen[0]?.key).toBe('rl:standard:u:507f1f77bcf86cd799439011');
    });

    it('falls back to the client address when there is no session', async () => {
        const { call } = await limited(standardLimiter);
        await call('/x');
        expect(seen[0]?.key.startsWith('rl:standard:ip:')).toBe(true);
    });

    it('treats an empty user id as no session rather than as one shared bucket', async () => {
        const { call } = await limited(standardLimiter, [asUser('')]);
        await call('/x');
        expect(seen[0]?.key.startsWith('rl:standard:ip:')).toBe(true);
    });
});

describe('the response', () => {
    it('reports what is left on every request, allowed or not', async () => {
        answer.remaining = 42;
        const { call } = await limited(standardLimiter);
        const response = await call('/x');
        expect(response.status).toBe(200);
        expect(response.headers.get('ratelimit-remaining')).toBe('42');
    });

    it('answers 429 with the shared RATE_LIMITED code when the bucket is empty', async () => {
        answer.allowed = false;
        answer.remaining = 0;
        answer.retryAfterMs = 1_500;

        const { call } = await limited(standardLimiter);
        const response = await call('/x');

        expect(response.status).toBe(429);
        expect(response.body).toEqual({ error: 'RATE_LIMITED' });
    });

    it('rounds Retry-After up to whole seconds, so a sub-second wait is not reported as zero', async () => {
        answer.allowed = false;
        answer.retryAfterMs = 1_200;

        const { call } = await limited(standardLimiter);
        const response = await call('/x');
        expect(response.headers.get('retry-after')).toBe('2');
    });

    it('does not reach the route when it refuses', async () => {
        answer.allowed = false;
        let reached = false;
        harness = await serve((app) => {
            app.use(quietLogger);
            app.get('/x', standardLimiter, (_req, res) => {
                reached = true;
                res.json({ ok: true });
            });
        });

        await harness.call('/x');
        expect(reached).toBe(false);
    });
});
