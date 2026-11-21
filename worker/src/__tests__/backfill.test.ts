import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OHLCV_INDEXES, REFERENCE_INDEXES } from '@ereuna/shared';

import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

vi.mock('dotenv/config', () => ({}));
/**
 * The one-shot runs on import, like the worker's own entry: each test imports
 * it afresh and asserts on what that import did, ending at the exit code.
 */
const db: { current: DbStub } = { current: fakeDb() };
const calls: string[] = [];
vi.mock('@/lib/redis.js', () => ({
    closeRedis: () => {
        calls.push('closeRedis');
        return Promise.resolve();
    },
}));
const state: { connectError: Error | null; locked: boolean; runError: Error | null } = {
    connectError: null,
    locked: false,
    runError: null,
};
vi.mock('@/lib/db.js', () => ({
    connectDb: () => {
        calls.push('connectDb');
        return state.connectError === null ? Promise.resolve() : Promise.reject(state.connectError);
    },
    getDb: () => db.current,
    closeDb: () => {
        calls.push('closeDb');
        return Promise.resolve();
    },
}));
vi.mock('@/organize/backfill.js', () => ({
    backfill: () => {
        calls.push(`backfill after ${db.current.writes().length} indexes`);
        return state.runError === null
            ? Promise.resolve({ symbols: 2, current: 0, filled: 1, restated: 0, failed: 1, written: 220 })
            : Promise.reject(state.runError);
    },
}));
vi.mock('@/organize/lock.js', () => ({
    withNightlyLock: (work: () => Promise<unknown>): Promise<unknown> =>
        state.locked ? Promise.resolve(null) : work(),
}));
const logged: { fatal: unknown[]; errors: unknown[] } = { fatal: [], errors: [] };
vi.mock('@/lib/logger.js', () => ({
    logger: {
        fatal: (payload: unknown): void => {
            logged.fatal.push(payload);
        },
        error: (payload: unknown): void => {
            logged.errors.push(payload);
        },
        info: (): void => {},
        warn: (): void => {},
        debug: (): void => {},
    },
}));

const ALL_INDEXES = [...OHLCV_INDEXES, ...REFERENCE_INDEXES];

/** Import the entry point and return the code it exited with. */
async function runCommand(): Promise<unknown> {
    vi.resetModules();
    await import('@/backfill.js');
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalled());
    return vi.mocked(process.exit).mock.calls[0]?.[0];
}

beforeEach(() => {
    db.current = fakeDb();
    calls.length = 0;
    logged.fatal = [];
    logged.errors = [];
    state.connectError = null;
    state.locked = false;
    state.runError = null;
    vi.restoreAllMocks();
    vi.spyOn(process, 'exit').mockImplementation(() => {
        // process.exit is typed `never` because it ends the process; a stub that records the call and
        // returns cannot satisfy that without a cast, and throwing instead would reject the chain under test
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the stub must return so the chain can finish
        return undefined as never;
    });
});

describe('npm run backfill', () => {
    it('applies every index the backfill writes past before it runs', async () => {
        await runCommand();
        expect(calls).toContain(`backfill after ${ALL_INDEXES.length} indexes`);
    });

    it('exits 0 when it finished, even with symbols the vendor refused, which a rerun retries', async () => {
        await expect(runCommand()).resolves.toBe(0);
    });

    it('exits 1 with a reason, and never runs, while a nightly run holds the lock', async () => {
        state.locked = true;
        await expect(runCommand()).resolves.toBe(1);
        expect(logged.errors).toHaveLength(1);
        expect(calls.some((call) => call.startsWith('backfill'))).toBe(false);
    });

    it('exits 1 with a reason, and never runs, when the database is unreachable', async () => {
        state.connectError = new Error('server selection timed out');
        await expect(runCommand()).resolves.toBe(1);
        expect(logged.fatal).toHaveLength(1);
        expect(calls.some((call) => call.startsWith('backfill'))).toBe(false);
    });

    it('exits 1 with a reason when the run itself throws', async () => {
        state.runError = new Error('universe read failed');
        await expect(runCommand()).resolves.toBe(1);
        expect(logged.fatal).toHaveLength(1);
    });

    it('closes both connections before it exits', async () => {
        await runCommand();
        expect(calls.slice(-2).sort()).toEqual(['closeDb', 'closeRedis']);
    });
});
