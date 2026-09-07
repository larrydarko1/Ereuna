import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The run is a straight dependency line, so what this suite checks is the line
 * itself: the order steps fire in, and that one vendor outage costs one step
 * rather than the night.
 */
const order: string[] = [];
const seen: Record<string, unknown[]> = {};
const fails = new Set<string>();
const state: { waitMs: number; universe: { symbol: string }[]; blocked: string | null; release: (() => void) | null } =
    {
        waitMs: 60_000,
        universe: [{ symbol: 'AAPL' }, { symbol: 'GONE' }],
        blocked: null,
        release: null,
    };

/**
 * A step that records that it ran and what with. `fails` arms it to throw and
 * `blocked` arms it to hang until the test releases it — spies would not
 * survive the `resetModules` each test needs.
 */
const step =
    (name: string, result: unknown = 0) =>
    (...args: unknown[]): Promise<unknown> => {
        order.push(name);
        seen[name] = args;
        if (fails.has(name)) return Promise.reject(new Error(`${name} is down`));
        if (state.blocked === name) {
            return new Promise<unknown>((resolve) => {
                state.release = (): void => resolve(result);
            });
        }
        return Promise.resolve(result);
    };

vi.mock('@/lib/config.js', () => ({
    config: { organize: { runOnStart: false, runHourEt: 19 } },
}));
vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));
vi.mock('@/organize/schedule.js', () => ({ msUntilNextRun: () => state.waitMs }));
vi.mock('@/organize/universe.js', () => ({ activeUniverse: () => Promise.resolve(state.universe) }));
vi.mock('@/organize/prices.js', () => ({
    updateDailyPrices: step('prices', { written: 1, splits: [{ symbol: 'AAPL' }], dividends: [{ symbol: 'AAPL' }] }),
}));
vi.mock('@/organize/corporate-actions.js', () => ({
    applySplits: step('splits'),
    applyDividends: step('dividends'),
}));
vi.mock('@/organize/weekly.js', () => ({ updateCurrentWeek: step('weekly') }));
vi.mock('@/organize/delist.js', () => ({
    markDelisted: step('delist', ['GONE']),
    stillListed: (universe: { symbol: string }[], delisted: string[]) =>
        universe.filter((asset) => !delisted.includes(asset.symbol)),
}));
vi.mock('@/organize/fundamentals.js', () => ({ updateFundamentals: step('fundamentals') }));
vi.mock('@/organize/daily-metrics.js', () => ({ updateDailyMetrics: step('metrics') }));
vi.mock('@/organize/valuation.js', () => ({ updateValuations: step('valuations') }));
vi.mock('@/organize/market-stats.js', () => ({ updateMarketStats: step('marketStats') }));
vi.mock('@/organize/holidays.js', () => ({ updateHolidays: step('holidays') }));
vi.mock('@/organize/prune.js', () => ({ pruneIntraday: step('prune') }));

const { config } = await import('@/lib/config.js');

/**
 * `stopping` is module state and never goes back to false, which is right for a
 * process that stops once and exits — so each test gets its own instance of the
 * module rather than sharing one that has already been told to stop.
 */
let startOrganizer: typeof import('@/organize/index.js').startOrganizer;
let stopOrganizer: typeof import('@/organize/index.js').stopOrganizer;

const THE_LINE = [
    'prices',
    'splits',
    'dividends',
    'weekly',
    'delist',
    'fundamentals',
    'metrics',
    'valuations',
    'marketStats',
    'holidays',
    'prune',
];

/**
 * Start the organizer and let one scheduled run finish.
 *
 * The returned promise is deliberately not awaited: it settles only when a run
 * completes AFTER the role was stopped, so a role stopped while merely waiting
 * never settles it — which is correct for a process that exits on the signal
 * that stopped it, and would hang a test that waited on it.
 */
async function runOnce(): Promise<void> {
    void startOrganizer();
    await vi.advanceTimersByTimeAsync(state.waitMs);
    await vi.advanceTimersByTimeAsync(0);
}

beforeEach(async () => {
    vi.useFakeTimers();
    order.length = 0;
    for (const key of Object.keys(seen)) delete seen[key];
    fails.clear();
    state.universe = [{ symbol: 'AAPL' }, { symbol: 'GONE' }];
    state.blocked = null;
    state.release = null;
    (config as { organize: { runOnStart: boolean } }).organize.runOnStart = false;

    vi.resetModules();
    ({ startOrganizer, stopOrganizer } = await import('@/organize/index.js'));
});

afterEach(() => {
    stopOrganizer();
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('the nightly line', () => {
    it("runs every step, in the order each one's inputs are written", async () => {
        await runOnce();
        expect(order).toEqual(THE_LINE);
    });

    it('costs one step and not the run when a step throws', async () => {
        fails.add('fundamentals');
        await runOnce();
        expect(order).toEqual(THE_LINE);
    });

    it('still applies the actions when prices failed, on an empty list', async () => {
        fails.add('prices');
        await runOnce();
        expect(order).toEqual(THE_LINE);
        expect(seen.splits).toEqual([[]]);
    });

    it('drops the symbols the delisting scan retired before the steps that follow it', async () => {
        await runOnce();
        expect(seen.metrics).toEqual([[{ symbol: 'AAPL' }]]);
    });

    it('keeps the whole universe when the delisting scan itself failed', async () => {
        fails.add('delist');
        await runOnce();
        expect(seen.metrics).toEqual([[{ symbol: 'AAPL' }, { symbol: 'GONE' }]]);
    });
});

describe('the schedule', () => {
    it('waits rather than running at startup by default', async () => {
        void startOrganizer();
        await vi.advanceTimersByTimeAsync(state.waitMs - 1);
        expect(order).toEqual([]);
    });

    it('runs immediately when ORGANIZE_ON_START is set, then schedules as usual', async () => {
        (config as { organize: { runOnStart: boolean } }).organize.runOnStart = true;
        void startOrganizer();
        await vi.advanceTimersByTimeAsync(0);
        expect(order).toEqual(THE_LINE);

        order.length = 0;
        await vi.advanceTimersByTimeAsync(state.waitMs);
        await vi.advanceTimersByTimeAsync(0);
        expect(order).toEqual(THE_LINE);
    });

    it('schedules the next run after one finishes', async () => {
        await runOnce();
        order.length = 0;
        await vi.advanceTimersByTimeAsync(state.waitMs);
        await vi.advanceTimersByTimeAsync(0);
        expect(order).toEqual(THE_LINE);
    });

    it('cancels the pending run when stopped mid-wait', async () => {
        void startOrganizer();
        stopOrganizer();
        await vi.advanceTimersByTimeAsync(state.waitMs * 2);
        expect(order).toEqual([]);
    });

    it('lets a run already under way finish, then resolves', async () => {
        state.blocked = 'prune';
        const started = startOrganizer();
        await vi.advanceTimersByTimeAsync(state.waitMs);

        // The run is parked on its last step; stopping now must not abandon it
        stopOrganizer();
        state.release?.();
        await vi.advanceTimersByTimeAsync(0);

        await expect(started).resolves.toBeUndefined();
        expect(order).toEqual(THE_LINE);
    });
});
