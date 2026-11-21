import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The simulator's entry point runs on import: it reads its flags, loads the
 * universe and its last bars, and starts the vendor. So each test re-imports
 * it with the flags it wants and asserts on what that import did.
 */
vi.mock('dotenv/config', () => ({}));
vi.mock('@/universe.js', () => ({ loadUniverse: () => Promise.resolve(['AAPL', 'MSFT']) }));

const calls: string[] = [];
vi.mock('@/lib/db.js', () => ({
    connectDb: () => {
        calls.push('connectDb');
        return Promise.resolve();
    },
    closeDb: () => {
        calls.push('closeDb');
        return Promise.resolve();
    },
}));
vi.mock('@/simulator/market.js', () => ({
    listLastBars: (symbols: readonly string[]) => {
        calls.push(`listLastBars:${symbols.join(',')}`);
        return Promise.resolve([{ symbol: 'AAPL', close: 200, volume: 1 }]);
    },
}));
const started: { options: Record<string, unknown> | null } = { options: null };
vi.mock('@/simulator/vendor.js', () => ({
    SIMULATOR_PORT: 8787,
    startVendor: (options: Record<string, unknown>) => {
        started.options = options;
        calls.push('startVendor');
        return Promise.resolve({
            port: 8787,
            close: () => {
                calls.push('closeVendor');
                return Promise.resolve();
            },
        });
    },
}));
const logged: { fatal: unknown[] } = { fatal: [] };
vi.mock('@/lib/logger.js', () => ({
    logger: {
        info: (): void => {},
        fatal: (payload: unknown): void => {
            logged.fatal.push(payload);
        },
    },
}));

const argv = process.argv;

/** Stubbed for the whole file: a shutdown settles a tick after the signal that started it. */
const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- process.exit is typed `never`; the stub must return so the shutdown under test can finish
    return undefined as never;
});

/** Import the entry point with `flags` on its command line. */
async function boot(flags: string[]): Promise<void> {
    process.argv = ['node', 'src/simulator/index.ts', ...flags];
    vi.resetModules();
    await import('@/simulator/index.js');
}

beforeEach(() => {
    calls.length = 0;
    started.options = null;
    logged.fatal = [];
    exit.mockClear();
});

afterEach(() => {
    process.argv = argv;
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
});

afterAll(() => {
    exit.mockRestore();
});

describe('the feed simulator entry point', () => {
    it('prices the universe from its last bars and serves it on the simulator port, 20 trades a second', async () => {
        await boot([]);
        await vi.waitFor(() => expect(calls).toContain('startVendor'));

        expect(calls).toEqual(['connectDb', 'listLastBars:AAPL,MSFT', 'startVendor']);
        expect(started.options).toMatchObject({ port: 8787, tradesPerSecond: 20 });
    });

    it('takes the trade rate from --rate', async () => {
        await boot(['--rate', '430']);
        await vi.waitFor(() => expect(calls).toContain('startVendor'));
        expect(started.options).toMatchObject({ tradesPerSecond: 430 });
    });

    it.each([
        ['a rate that is not a number', ['--rate', 'fast']],
        ['a rate of zero', ['--rate', '0']],
        ['a flag it does not know', ['--symbols', 'AAPL']],
    ])('refuses %s and exits with a failure', async (_label, flags) => {
        await boot(flags);
        await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
        expect(logged.fatal).toHaveLength(1);
        expect(calls).not.toContain('startVendor');
    });

    it.each(['SIGTERM', 'SIGINT'] as const)('closes the vendor and the database on %s', async (signal) => {
        await boot([]);
        await vi.waitFor(() => expect(calls).toContain('startVendor'));

        process.emit(signal);
        await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
        expect(calls).toEqual(expect.arrayContaining(['closeVendor', 'closeDb']));
    });
});
