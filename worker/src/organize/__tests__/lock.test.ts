import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Redis as the lock sees it: one key with an owner and an expiry. The two Lua
 * scripts are told apart by what they call, and run here as Redis would run
 * them, so the tests hold the compare-then-act behaviour rather than the text.
 */
const store = new Map<string, { value: string; expiresAt: number }>();
const logged: { errors: unknown[] } = { errors: [] };
vi.mock('@/lib/logger.js', () => ({
    logger: {
        error: (payload: unknown): void => {
            logged.errors.push(payload);
        },
        info: (): void => {},
        warn: (): void => {},
        debug: (): void => {},
    },
}));
const KEY = 'worker:nightly:lock';

const redis = {
    set: vi.fn((key: string, value: string, _px: 'PX', ttl: number, _nx: 'NX'): Promise<'OK' | null> => {
        if (live(key) !== null) return Promise.resolve(null);
        store.set(key, { value, expiresAt: Date.now() + ttl });
        return Promise.resolve('OK');
    }),
    eval: vi.fn((script: string, _keys: number, key: string, holder: string, ttl?: number): Promise<number> => {
        if (live(key) !== holder) return Promise.resolve(0);
        if (script.includes('pexpire')) store.set(key, { value: holder, expiresAt: Date.now() + Number(ttl) });
        else store.delete(key);
        return Promise.resolve(1);
    }),
};

vi.mock('@/lib/redis.js', () => ({ getPublisher: () => redis }));

const { withNightlyLock } = await import('@/organize/lock.js');

function live(key: string): string | null {
    const entry = store.get(key);
    if (entry === undefined || entry.expiresAt <= Date.now()) return null;
    return entry.value;
}

/** A run that holds the lock until the test lets it go. */
function parkedRun(): { done: Promise<string | null>; finish: () => void } {
    let finish = (): void => {};
    const done = withNightlyLock(
        () =>
            new Promise<string>((resolve) => {
                finish = (): void => resolve('first');
            }),
    );
    return { done, finish: () => finish() };
}

beforeEach(() => {
    vi.useFakeTimers();
    store.clear();
    logged.errors = [];
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('withNightlyLock', () => {
    it('runs the work and frees the lock when it finishes', async () => {
        await expect(withNightlyLock(() => Promise.resolve('done'))).resolves.toBe('done');
        expect(live(KEY)).toBeNull();
    });

    it('skips the work while another run holds the lock', async () => {
        const first = parkedRun();
        await vi.advanceTimersByTimeAsync(0);

        const work = vi.fn(() => Promise.resolve('second'));
        await expect(withNightlyLock(work)).resolves.toBeNull();
        expect(work).not.toHaveBeenCalled();

        first.finish();
        await expect(first.done).resolves.toBe('first');
    });

    it('keeps the lock through a run longer than its expiry', async () => {
        const first = parkedRun();
        await vi.advanceTimersByTimeAsync(10 * 60_000);

        await expect(withNightlyLock(() => Promise.resolve('second'))).resolves.toBeNull();
        first.finish();
        await first.done;
    });

    it('frees the lock when the work throws, and passes the error on', async () => {
        await expect(withNightlyLock(() => Promise.reject(new Error('vendor down')))).rejects.toThrow('vendor down');
        expect(live(KEY)).toBeNull();
    });

    it('frees itself after a crash: a key nobody renews expires', async () => {
        store.set(KEY, { value: 'crashed-run', expiresAt: Date.now() + 120_000 });
        await vi.advanceTimersByTimeAsync(120_000);

        await expect(withNightlyLock(() => Promise.resolve('next'))).resolves.toBe('next');
    });

    it('never frees a lock another run took after this one lost it', async () => {
        const first = parkedRun();
        await vi.advanceTimersByTimeAsync(0);
        store.set(KEY, { value: 'another-run', expiresAt: Date.now() + 120_000 });

        await vi.advanceTimersByTimeAsync(30_000);
        first.finish();
        await first.done;

        expect(live(KEY)).toBe('another-run');
        expect(logged.errors).toHaveLength(1);
    });
});
