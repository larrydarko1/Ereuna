import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The entry point runs on import: it connects, starts the probes, enters the
 * session loop and installs the signal handlers. So each test re-imports it and
 * asserts on what that import did.
 */
const calls: string[] = [];
const logged: { errors: unknown[]; fatal: unknown[]; warnings: unknown[] } = {
    errors: [],
    fatal: [],
    warnings: [],
};
const state: {
    connectError: Error | null;
    holidays: string[];
    isHoliday: boolean;
    open: boolean;
    universe: string[];
    sessions: number;
} = {
    connectError: null,
    holidays: [],
    isHoliday: false,
    open: true,
    universe: ['AAPL'],
    sessions: 0,
};

vi.mock('dotenv/config', () => ({}));
vi.mock('@/lib/config.js', () => ({
    config: { probe: { port: 9092, token: undefined }, pollIntervalMs: 10_000 },
}));
vi.mock('@/lib/db.js', () => ({
    connectDb: () => {
        calls.push('connectDb');
        return state.connectError === null ? Promise.resolve() : Promise.reject(state.connectError);
    },
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
        warn: (payload: unknown): void => {
            logged.warnings.push(payload);
        },
        info: (): void => {},
        debug: (): void => {},
    },
}));
vi.mock('@ereuna/shared/service/probes', () => ({
    startProbeServer: () => {
        calls.push('startProbeServer');
        return {
            close: (): void => {
                calls.push('closeProbes');
            },
        };
    },
}));
vi.mock('@/calendar.js', () => ({
    getHolidays: () => {
        calls.push('getHolidays');
        return Promise.resolve(state.holidays);
    },
    isHoliday: () => state.isHoliday,
    isMarketHours: () => state.open,
}));
vi.mock('@/universe.js', () => ({
    loadUniverse: () => {
        calls.push('loadUniverse');
        return Promise.resolve(state.universe);
    },
}));
vi.mock('@/tiingo.js', () => ({
    runSession: () => {
        calls.push('runSession');
        state.sessions += 1;
        return Promise.resolve();
    },
}));

/**
 * `process.exit` is stubbed for the whole file rather than per test: the
 * shutdown chain settles a tick after the signal, and restoring the spy between
 * tests would leave a late `.then(exit)` landing on the real one.
 */
const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

beforeAll(() => {
    exit.mockClear();
});

afterAll(() => {
    exit.mockRestore();
});

/** Import the entry point and let it reach its first loop iteration. */
async function boot(): Promise<void> {
    vi.resetModules();
    await import('@/index.js');
    await vi.waitFor(() => expect(calls).toContain('startProbeServer'));
}

beforeEach(() => {
    calls.length = 0;
    logged.errors = [];
    logged.fatal = [];
    logged.warnings = [];
    state.connectError = null;
    state.holidays = [];
    state.isHoliday = false;
    state.open = true;
    state.universe = ['AAPL'];
    state.sessions = 0;
    exit.mockClear();
});

// The loop runs until it is told to stop, so every test has to stop it. The
// wait is a poll rather than an assertion: a teardown is not a test, and
// `expect` outside one reports its failure against whichever test ran last.
afterEach(async () => {
    process.emit('SIGTERM');
    await vi.waitFor(() => {
        if (exit.mock.calls.length === 0) throw new Error('the ingestor has not shut down');
    });
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
});

describe('startup', () => {
    it('connects before it serves probes or opens a session', async () => {
        await boot();
        expect(calls[0]).toBe('connectDb');
        expect(calls.indexOf('connectDb')).toBeLessThan(calls.indexOf('startProbeServer'));
    });

    it('kills the process with a reason when the database is unreachable', async () => {
        state.connectError = new Error('server selection timed out');
        vi.resetModules();
        await import('@/index.js');
        await vi.waitFor(() => expect(logged.fatal).toHaveLength(1));
        expect(exit).toHaveBeenCalledWith(1);
    });
});

describe('the session loop', () => {
    it('loads the universe fresh and runs a session while the market is open', async () => {
        await boot();
        await vi.waitFor(() => expect(state.sessions).toBeGreaterThan(0));
        expect(calls).toContain('loadUniverse');
    });

    it('checks the holiday calendar before it does anything expensive', async () => {
        await boot();
        await vi.waitFor(() => expect(calls).toContain('getHolidays'));
        expect(calls.indexOf('getHolidays')).toBeLessThan(calls.indexOf('loadUniverse'));
    });

    it('does not read the universe on a holiday', async () => {
        state.isHoliday = true;
        await boot();
        await vi.waitFor(() => expect(calls).toContain('getHolidays'));
        expect(calls).not.toContain('loadUniverse');
    });

    it('does not open a session outside market hours', async () => {
        state.open = false;
        await boot();
        await vi.waitFor(() => expect(calls).toContain('getHolidays'));
        expect(calls).not.toContain('runSession');
    });

    it('waits rather than subscribing to nothing when the universe is empty', async () => {
        state.universe = [];
        await boot();
        await vi.waitFor(() => expect(logged.warnings).toHaveLength(1));
        expect(calls).not.toContain('runSession');
    });
});

describe('shutdown', () => {
    it.each(['SIGTERM', 'SIGINT'] as const)('closes the connections and exits on %s', async (signal) => {
        await boot();
        calls.length = 0;

        process.emit(signal);
        await vi.waitFor(() => expect(calls).toContain('closeRedis'));

        expect(calls).toContain('closeProbes');
        expect(calls).toContain('closeDb');
        await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    });
});
