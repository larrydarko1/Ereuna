/**
 * The vendor's hourly request allowance, counted in Redis so every process that
 * calls it shares one count. A count kept in memory started from zero after a
 * restart, and the vendor, which still remembered the last hour, refused it.
 */
import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { getPublisher } from '@/lib/redis.js';

const SENT_KEY = 'worker:tiingo:sent';
const REFUSED_KEY = 'worker:tiingo:refused';

/**
 * Check and count in one step, over a sliding window, so two processes can
 * never both take the last slot.
 *   KEYS = the sent set (score: send time), the refused flag
 *   ARGV = nowMs, windowMs, limit, a member unique to this request
 *   returns -1 while refused, 0 once counted, else ms until one more fits
 */
const RESERVE = `
if redis.call('EXISTS', KEYS[2]) == 1 then return -1 end
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
local count = redis.call('ZCARD', KEYS[1])
if count < limit then
  redis.call('ZADD', KEYS[1], now, ARGV[4])
  redis.call('PEXPIRE', KEYS[1], window)
  return 0
end
local blocking = redis.call('ZRANGE', KEYS[1], count - limit, count - limit, 'WITHSCORES')
return math.max(1, tonumber(blocking[2]) + window - now)
`;

export const REFUSED = -1;

/** Count one request against the allowance: 0 when counted, REFUSED, or how long to wait before asking again. */
export async function reserve(limit: number, windowMs: number): Promise<number> {
    const now = Date.now();
    const reply = await getPublisher().eval(
        RESERVE,
        2,
        SENT_KEY,
        REFUSED_KEY,
        now,
        windowMs,
        limit,
        `${now}:${randomUUID()}`,
    );
    return z.number().int().parse(reply);
}

/** Tell every process the vendor said the allowance is spent, for `ms`. */
export async function refuse(ms: number): Promise<void> {
    await getPublisher().set(REFUSED_KEY, '1', 'PX', ms);
}
