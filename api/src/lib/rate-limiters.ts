/**
 * HTTP rate-limiter tiers — token bucket, Redis-backed, shared across replicas.
 * Applied per router in index.ts; no route group is mounted without one.
 *   strict   — auth endpoints.              burst 15,  refill 15 / 15 min
 *   standard — general reads and mutations. burst 100, refill 100 / min
 *   relaxed  — market data and other reads.  burst 300, refill 300 / min
 * Keyed by authenticated user id when present, else by `req.ip`: IP-only limits
 * are trivially bypassed and unfairly punish shared addresses (offices, NAT).
 * `optionalAuth` therefore has to run BEFORE these, or `req.userId` is unset
 * and every authenticated request silently keys by IP instead.
 * For the IP fallback to be the real client behind the proxy, `trust proxy`
 * must be the configured hop count — without it every anonymous client
 * collapses to the proxy address and shares one bucket.
 * On a Redis outage the underlying bucket fails open (see lib/token-bucket.ts).
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '@/lib/app-error.js';
import { bucketKey, consumeTokenBucket, type TokenBucketOptions } from '@/lib/token-bucket.js';
import type { AuthRequest } from '@/middleware/auth.js';

export const strictLimiter = tier('rl:strict:', 15, 15 * 60 * 1000);
export const standardLimiter = tier('rl:standard:', 100, 60 * 1000);
export const relaxedLimiter = tier('rl:relaxed:', 300, 60 * 1000);

/** Build a token-bucket Express middleware for one tier. */
function tier(prefix: string, capacity: number, windowMs: number): RequestHandler {
    const opts: TokenBucketOptions = { capacity, refillPerMs: capacity / windowMs };

    return (req: Request, res: Response, next: NextFunction): void => {
        const { userId } = req as AuthRequest;
        const identity = userId !== undefined && userId !== '' ? `u:${userId}` : `ip:${req.ip ?? 'unknown'}`;

        void consumeTokenBucket(bucketKey(prefix, identity), opts).then((result) => {
            res.setHeader('RateLimit-Remaining', String(result.remaining));
            if (result.allowed) {
                next();
                return;
            }
            res.setHeader('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
            next(
                new AppError(429, 'RATE_LIMITED', 'Rate limit exceeded', {
                    logContext: { op: 'ratelimit', tier: prefix },
                    securityEvent: true,
                }),
            );
        }, next);
    };
}
