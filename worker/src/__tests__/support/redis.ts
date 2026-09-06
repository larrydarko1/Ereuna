/**
 * A Redis double for the aggregate role.
 * Only the commands the role actually issues are implemented, and each one
 * records its arguments — the value of these tests is in the exact command
 * shapes (`xreadgroup`'s flags, `set … PX`), which a fuller fake would hide
 * behind its own interpretation of them.
 */
import { vi, type Mock } from 'vitest';

type MultiStub = {
    calls: [string, unknown[]][];
    publish: Mock;
    set: Mock;
    exec: Mock;
};

export type RedisStub = {
    xgroup: Mock;
    xreadgroup: Mock;
    xack: Mock;
    multi: Mock;
    quit: Mock;
    /** Every `multi()` chain opened, oldest first. */
    transactions: MultiStub[];
};

export function fakeRedis(): RedisStub {
    const transactions: MultiStub[] = [];

    const multi = vi.fn(() => {
        const calls: [string, unknown[]][] = [];
        const chain: MultiStub = {
            calls,
            publish: vi.fn((...args: unknown[]) => {
                calls.push(['publish', args]);
                return chain;
            }),
            set: vi.fn((...args: unknown[]) => {
                calls.push(['set', args]);
                return chain;
            }),
            exec: vi.fn(() => Promise.resolve([])),
        };
        transactions.push(chain);
        return chain;
    });

    return {
        xgroup: vi.fn(() => Promise.resolve('OK')),
        xreadgroup: vi.fn(() => Promise.resolve(null)),
        xack: vi.fn(() => Promise.resolve(1)),
        multi,
        quit: vi.fn(() => Promise.resolve('OK')),
        transactions,
    };
}
