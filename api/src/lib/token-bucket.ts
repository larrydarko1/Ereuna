/** Distributed token-bucket rate limiter backed by Redis. */
import { getRedis } from '@/lib/redis.js';
import { logger } from '@/lib/logger.js';

export type TokenBucketOptions = {
    capacity: number;
    refillPerMs: number;
};

export type ConsumeResult = {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
};

/**
 * Atomic refill-and-consume. State per key is a hash of { tokens, ts }; an
 * absent key is a full bucket, and the TTL is long enough to refill from empty.
 *   KEYS[1] = bucket key
 *   ARGV    = capacity, refillPerMs, nowMs, cost, ttlMs
 *   returns { allowed(0|1), remainingTokens, retryAfterMs }
 */
const SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

local state = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(state[1])
local ts = tonumber(state[2])
if tokens == nil then
  tokens = capacity
  ts = now
end

local elapsed = now - ts
if elapsed < 0 then elapsed = 0 end
tokens = math.min(capacity, tokens + elapsed * refill)

local allowed = 0
if tokens >= cost then
  allowed = 1
  tokens = tokens - cost
end

redis.call('HSET', key, 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', key, ttl)

local retry = 0
if allowed == 0 then
  retry = math.ceil((cost - tokens) / refill)
end
return {allowed, math.floor(tokens), retry}
`;

/**
 * Fail OPEN on a Redis error. A cache blip must not lock every client out of
 * the platform — that is a worse availability failure than briefly relaxed
 * throttling. The warning keeps the outage visible and alertable.
 */
const FAIL_OPEN: ConsumeResult = { allowed: true, remaining: 0, retryAfterMs: 0 };

/** Attempt to take `cost` tokens from the bucket at `key`. */
export async function consumeTokenBucket(key: string, opts: TokenBucketOptions, cost = 1): Promise<ConsumeResult> {
    const ttlMs = Math.ceil(opts.capacity / opts.refillPerMs) + 1000;
    try {
        const res = (await getRedis().eval(
            SCRIPT,
            1,
            key,
            opts.capacity,
            opts.refillPerMs,
            Date.now(),
            cost,
            ttlMs,
        )) as [number, number, number];
        return { allowed: res[0] === 1, remaining: res[1], retryAfterMs: res[2] };
    } catch (err) {
        logger.warn({ err, key }, 'Token bucket check failed — allowing (fail-open)');
        return FAIL_OPEN;
    }
}

/** Build a limiter key from a namespace prefix and an identifier. */
export function bucketKey(prefix: string, id: string): string {
    return `${prefix}${id}`;
}
