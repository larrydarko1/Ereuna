/**
 * A Redis double for the API.
 * Only the commands the API issues are implemented. Every one of them can be
 * armed to reject, because "fails open" is the property most of the callers are
 * written around and it is not testable without a Redis that can break.
 */
import { vi, type Mock } from 'vitest';

export type RedisStub = {
    store: Map<string, string>;
    get: Mock;
    set: Mock;
    setex: Mock;
    del: Mock;
    exists: Mock;
    scan: Mock;
    eval: Mock;
    incr: Mock;
    expire: Mock;
    ttl: Mock;
    quit: Mock;
    on: Mock;
    breakAll: () => void; // Make every command reject, as an unreachable instance would
};

export function fakeRedis(): RedisStub {
    const store = new Map<string, string>();

    const stub: RedisStub = {
        store,
        get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
        set: vi.fn((key: string, value: string) => {
            store.set(key, value);
            return Promise.resolve('OK');
        }),
        setex: vi.fn((key: string, _ttl: number, value: string) => {
            store.set(key, value);
            return Promise.resolve('OK');
        }),
        del: vi.fn((...keys: string[]) => {
            let removed = 0;
            for (const key of keys) if (store.delete(key)) removed += 1;
            return Promise.resolve(removed);
        }),
        exists: vi.fn((...keys: string[]) => Promise.resolve(keys.filter((key) => store.has(key)).length)),
        scan: vi.fn((_cursor: string, _match: string, pattern: string) => {
            const prefix = pattern.replace(/\*$/, '');
            return Promise.resolve(['0', [...store.keys()].filter((key) => key.startsWith(prefix))]);
        }),
        eval: vi.fn(() => Promise.resolve([1, 99, 0])),
        incr: vi.fn(() => Promise.resolve(1)),
        expire: vi.fn(() => Promise.resolve(1)),
        ttl: vi.fn(() => Promise.resolve(-1)),
        quit: vi.fn(() => Promise.resolve('OK')),
        on: vi.fn(() => stub),
        breakAll: (): void => {
            const boom = (): Promise<never> => Promise.reject(new Error('connection refused'));
            for (const name of [
                'get',
                'set',
                'setex',
                'del',
                'exists',
                'scan',
                'eval',
                'incr',
                'expire',
                'ttl',
            ] as const) {
                stub[name].mockImplementation(boom);
            }
        },
    };

    return stub;
}
