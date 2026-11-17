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
const state: {
    connectError: Error | null;
    summary: { steps: number; failed: string[]; durationMs: number } | null;
    runError: Error | null;
} = { connectError: null, summary: null, runError: null };
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
vi.mock('@/organize/index.js', () => ({
    runNightly: () => {
        calls.push(`runNightly after ${db.current.writes().length} indexes`);
        return state.runError === null ? Promise.resolve(state.summary) : Promise.reject(state.runError);
    },
}));
const logged: { fatal: unknown[] } = { fatal: [] };
vi.mock('@/lib/logger.js', () => ({
    logger: {
        fatal: (payload: unknown): void => {
            logged.fatal.push(payload);
        },
        error: (): void => {},
        info: (): void => {},
        warn: (): void => {},
        debug: (): void => {},
    },
}));

const ALL_INDEXES = [...OHLCV_INDEXES, ...REFERENCE_INDEXES];
const CLEAN_RUN = { steps: 11, failed: [], durationMs: 1 };

/** Import the entry point and return the code it exited with. */
async function runCommand(): Promise<unknown> {
    vi.resetModules();
    await import('@/nightly.js');
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalled());
    return vi.mocked(process.exit).mock.calls[0]?.[0];
}

beforeEach(() => {
    db.current = fakeDb();
    calls.length = 0;
    logged.fatal = [];
    state.connectError = null;
    state.summary = CLEAN_RUN;
    state.runError = null;
    vi.restoreAllMocks();
    vi.spyOn(process, 'exit').mockImplementation(() => {
        // process.exit is typed `never` because it ends the process; a stub that records the call and
        // returns cannot satisfy that without a cast, and throwing instead would reject the chain under test
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the stub must return so the chain can finish
        return undefined as never;
    });
});

describe('npm run nightly', () => {
    it('applies every index the nightly writes past before it runs', async () => {
        await runCommand();
        expect(calls).toContain(`runNightly after ${ALL_INDEXES.length} indexes`);
    });

    it('exits 0 when every step succeeded', async () => {
        await expect(runCommand()).resolves.toBe(0);
    });

    it('exits 1 when a step failed', async () => {
        state.summary = { ...CLEAN_RUN, failed: ['fundamentals'] };
        await expect(runCommand()).resolves.toBe(1);
    });

    it('exits 1 when another run held the lock and this one was skipped', async () => {
        state.summary = null;
        await expect(runCommand()).resolves.toBe(1);
    });

    it('exits 1 with a reason, and never runs, when the database is unreachable', async () => {
        state.connectError = new Error('server selection timed out');
        await expect(runCommand()).resolves.toBe(1);
        expect(logged.fatal).toHaveLength(1);
        expect(calls.some((call) => call.startsWith('runNightly'))).toBe(false);
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
