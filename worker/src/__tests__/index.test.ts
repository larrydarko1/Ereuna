import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OHLCV_INDEXES, REFERENCE_INDEXES } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

/**
 * The entry point runs on import: it connects, applies indexes, starts the
 * probes and both roles, and installs the signal handlers. So every test here
 * re-imports it under a different `WORKER_ROLE`, and the assertions are on what
 * that import did.
 */
const db: { current: DbStub } = { current: fakeDb() };
const calls: string[] = [];
const logged: { errors: unknown[]; fatal: unknown[] } = { errors: [], fatal: [] };
const state: { role: string; connectError: Error | null; probeOptions: Record<string, unknown> | null } = {
    role: 'all',
    connectError: null,
    probeOptions: null,
};

vi.mock('dotenv/config', () => ({}));
vi.mock('@/lib/config.js', () => ({
    get config() {
        return { role: state.role, probe: { port: 9093, token: undefined } };
    },
}));
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
vi.mock('@/lib/redis.js', () => ({
    closeRedis: () => {
        calls.push('closeRedis');
        return Promise.resolve();
    },
}));
vi.mock('@/lib/logger.js', () => ({
    logger: {
        error: (payload: unknown): void => {
            logged.errors.push(payload);
        },
        fatal: (payload: unknown): void => {
            logged.fatal.push(payload);
        },
        info: (): void => {},
        warn: (): void => {},
        debug: (): void => {},
    },
}));
vi.mock('@ereuna/shared/service/probes', () => ({
    startProbeServer: (options: Record<string, unknown>) => {
        calls.push('startProbeServer');
        state.probeOptions = options;
        return {
            close: (): void => {
                calls.push('closeProbes');
            },
        };
    },
}));
vi.mock('@/aggregate/index.js', () => ({
    startAggregator: () => {
        calls.push('startAggregator');
        return Promise.resolve();
    },
    stopAggregator: () => {
        calls.push('stopAggregator');
        return Promise.resolve();
    },
}));
vi.mock('@/organize/index.js', () => ({
    startOrganizer: () => {
        calls.push('startOrganizer');
        return Promise.resolve();
    },
    stopOrganizer: (): void => {
        calls.push('stopOrganizer');
    },
}));

/** Import the entry point and let its startup chain settle. */
async function boot(role: string): Promise<void> {
    state.role = role;
    vi.resetModules();
    await import('@/index.js');
    await vi.waitFor(() => expect(calls).toContain('startProbeServer'));
}

const indexedCollections = (): string[] => db.current.writes().map((write) => write.collection);

beforeEach(() => {
    db.current = fakeDb();
    calls.length = 0;
    logged.errors = [];
    logged.fatal = [];
    state.connectError = null;
    state.probeOptions = null;
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
});

afterEach(() => {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    vi.restoreAllMocks();
});

describe('startup', () => {
    it('connects and applies the indexes before anything consumes a trade', async () => {
        await boot('aggregate');
        expect(calls.indexOf('connectDb')).toBeLessThan(calls.indexOf('startAggregator'));
        expect(db.current.writes().length).toBeGreaterThan(0);
    });

    it('applies only the candle indexes in the aggregate role', async () => {
        await boot('aggregate');
        expect(new Set(indexedCollections())).toEqual(new Set(OHLCV_INDEXES.map((spec) => spec.collection)));
    });

    it('applies the reference indexes too in a role that runs the nightly batch', async () => {
        await boot('organize');
        const expected = [...OHLCV_INDEXES, ...REFERENCE_INDEXES].map((spec) => spec.collection);
        expect(new Set(indexedCollections())).toEqual(new Set(expected));
    });

    it('logs an index that could not be built and carries on — a night of prices is worth more', async () => {
        db.current = fakeDb();
        db.current.of('OHCLVData').createIndex.mockRejectedValueOnce(new Error('duplicate key'));
        await boot('aggregate');
        expect(logged.errors).toHaveLength(1);
        expect(calls).toContain('startAggregator');
    });

    it('serves probes on the configured port', async () => {
        await boot('all');
        expect(state.probeOptions).toMatchObject({ port: 9093 });
    });

    it('kills the process with a reason when the database is unreachable', async () => {
        state.connectError = new Error('server selection timed out');
        state.role = 'all';
        vi.resetModules();
        await import('@/index.js');
        await vi.waitFor(() => expect(logged.fatal).toHaveLength(1));
        expect(process.exit).toHaveBeenCalledWith(1);
    });
});

describe('the roles', () => {
    it.each([
        ['all', ['startAggregator', 'startOrganizer']],
        ['aggregate', ['startAggregator']],
        ['organize', ['startOrganizer']],
    ])('starts %s as %o', async (role, expected) => {
        await boot(role);
        expect(calls.filter((call) => call.startsWith('start') && call !== 'startProbeServer')).toEqual(expected);
    });
});

describe('shutdown', () => {
    it.each(['SIGTERM', 'SIGINT'] as const)('stops both roles and closes everything on %s', async (signal) => {
        await boot('all');
        calls.length = 0;

        process.emit(signal);
        await vi.waitFor(() => expect(calls).toContain('closeRedis'));

        expect(calls).toContain('stopOrganizer');
        expect(calls).toContain('stopAggregator');
        expect(calls).toContain('closeProbes');
        expect(calls).toContain('closeDb');
        expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('flushes the candles before it closes the connections they are written over', async () => {
        await boot('all');
        calls.length = 0;

        process.emit('SIGTERM');
        await vi.waitFor(() => expect(calls).toContain('closeDb'));
        expect(calls.indexOf('stopAggregator')).toBeLessThan(calls.indexOf('closeDb'));
    });
});
