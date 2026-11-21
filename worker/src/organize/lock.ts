/**
 * The nightly lock: one run at a time across every process, so a manual
 * `npm run nightly` or a second organize replica cannot replace the same bars
 * as the scheduled run. The key expires on its own, so a run that crashed
 * frees it within `TTL_MS`; a run in progress keeps renewing it.
 */
import { randomUUID } from 'node:crypto';

import { logger } from '@/lib/logger.js';
import { getPublisher } from '@/lib/redis.js';

const KEY = 'worker:nightly:lock';
const TTL_MS = 120_000;
const RENEW_MS = 30_000;

// Both compare the holder first, so a run can never extend or free a lock that another run now holds
const RENEW =
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) end return 0";
const RELEASE = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0";

/** Run `work` holding the lock; null, without running it, when another run holds it. */
export async function withNightlyLock<T>(work: () => Promise<T>): Promise<T | null> {
    const redis = getPublisher();
    const holder = randomUUID();

    if ((await redis.set(KEY, holder, 'PX', TTL_MS, 'NX')) === null) return null;

    const renewal = setInterval(() => {
        redis
            .eval(RENEW, 1, KEY, holder, TTL_MS)
            .then((renewed) => {
                if (renewed === 0) logger.error({ key: KEY }, 'Nightly lock lost mid-run; another run may now start');
            })
            .catch((err: unknown) => logger.error({ err, key: KEY }, 'Nightly lock renewal failed'));
    }, RENEW_MS);

    try {
        return await work();
    } finally {
        clearInterval(renewal);
        await redis
            .eval(RELEASE, 1, KEY, holder)
            .catch((err: unknown) =>
                logger.error({ err, key: KEY }, 'Nightly lock release failed; it expires on its own'),
            );
    }
}
