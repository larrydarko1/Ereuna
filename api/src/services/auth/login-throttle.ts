/**
 * Per-account login throttling (OWASP: throttle before locking).
 * The per-IP token bucket in lib/rate-limiters.ts is the first line of defence;
 * this is the second. Failures are counted in Redis under a stable per-account
 * identifier, so an attacker rotating IPs against one account still hits the
 * wall — and locks stay short and escalate gradually, so a hard lockout cannot
 * be weaponised to deny a real user service.
 * Policy:
 *   failures 1–4   → no delay
 *   failures 5–9   → exponential backoff lock: 2^(n-4) seconds (2 s … 32 s)
 *   failures ≥ 10  → 15-minute lock
 *   the counter expires 15 min after the last failure, and clears on success
 * Redis being unavailable fails OPEN — an attempt is allowed and a warning
 * logged — because a cache outage must not lock every user out of the platform.
 */
import { AppError } from '@/lib/app-error.js';
import { sha256 } from '@/lib/crypto.js';
import { logger } from '@/lib/logger.js';
import { getRedis } from '@/lib/redis.js';

const FAIL_WINDOW_S = 15 * 60;
const BACKOFF_THRESHOLD = 5;
const LOCK_THRESHOLD = 10;
const LOCK_S = 15 * 60;

/**
 * The throttle key for a submitted username.
 * Hashed rather than raw so the identifier never lands in Redis in plaintext,
 * and derived from the *submitted* name rather than a user id — an id does not
 * exist for an unknown account, and keying by one would make throttling
 * behaviour differ between real and non-existent usernames, which is an
 * account-enumeration oracle.
 */
export function throttleKey(username: string): string {
    return sha256(username.trim().toLowerCase());
}

export async function assertLoginAllowed(key: string): Promise<void> {
    let locked = false;
    try {
        locked = (await getRedis().exists(lockKey(key))) === 1;
    } catch (err) {
        logger.warn({ err }, 'Login throttle check failed — allowing attempt (fail-open)');
    }

    if (locked) {
        throw new AppError(429, 'RATE_LIMITED', 'Account temporarily locked after repeated failed logins', {
            logContext: { op: 'auth.throttle' },
            securityEvent: true,
        });
    }
}

export async function recordLoginFailure(key: string): Promise<number> {
    try {
        const redis = getRedis();
        const failures = await redis.incr(failKey(key));
        await redis.expire(failKey(key), FAIL_WINDOW_S);

        if (failures >= LOCK_THRESHOLD) {
            await redis.set(lockKey(key), '1', 'EX', LOCK_S);
        } else if (failures >= BACKOFF_THRESHOLD) {
            await redis.set(lockKey(key), '1', 'EX', 2 ** (failures - BACKOFF_THRESHOLD + 1));
        }
        return failures;
    } catch (err) {
        logger.warn({ err }, 'Failed to record login failure (fail-open)');
        return 0;
    }
}

export async function clearLoginFailures(key: string): Promise<void> {
    try {
        await getRedis().del(failKey(key), lockKey(key));
    } catch (err) {
        logger.warn({ err }, 'Failed to clear login failures');
    }
}

function failKey(key: string): string {
    return `login:fail:${key}`;
}

function lockKey(key: string): string {
    return `login:lock:${key}`;
}
