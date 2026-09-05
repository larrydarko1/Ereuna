/** The nightly run. */
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';
import { updateCalendar, updateHolidays } from '@/organize/calendar.js';
import { applyDividends, applySplits } from '@/organize/corporate-actions.js';
import { updateDailyMetrics } from '@/organize/daily-metrics.js';
import { markDelisted, stillListed } from '@/organize/delist.js';
import { updateFundamentals } from '@/organize/fundamentals.js';
import { updateMarketStats } from '@/organize/market-stats.js';
import { updateNews } from '@/organize/news.js';
import { updateDailyPrices, type PriceUpdate } from '@/organize/prices.js';
import { pruneIntraday } from '@/organize/prune.js';
import { msUntilNextRun } from '@/organize/schedule.js';
import { activeUniverse } from '@/organize/universe.js';
import { updateValuations } from '@/organize/valuation.js';
import { updateCurrentWeek } from '@/organize/weekly.js';

type RunSummary = {
    steps: number;
    failed: string[];
    durationMs: number;
};

/** What the price step yields when it fails: no bars, and so no actions to apply. */
const NO_PRICES: PriceUpdate = { written: 0, splits: [], dividends: [] };

let timer: NodeJS.Timeout | undefined;
let stopping = false;

/**
 * The organize role: wait for the run hour, run, wait again.
 * A timer per run rather than one interval, because the wait is recomputed from
 * the exchange's clock each time and a daylight-saving change moves it by an
 * hour. Resolves only when the role is stopped.
 */
export async function startOrganizer(): Promise<void> {
    if (config.organize.runOnStart) {
        logger.warn('ORGANIZE_ON_START is set — running immediately');
        await runNightly();
    }

    return new Promise<void>((resolve): void => {
        const schedule = (): void => {
            if (stopping) {
                resolve();
                return;
            }

            const wait = msUntilNextRun();
            logger.info({ hours: (wait / 3_600_000).toFixed(2) }, 'Waiting for the next nightly run');

            timer = setTimeout(() => {
                runNightly()
                    .catch((err: Error) => logger.error({ err }, 'Nightly run threw'))
                    .finally(schedule);
            }, wait);
        };

        schedule();
    });
}

/**
 * Stop scheduling.
 * A run already under way is left to finish — it holds partially written
 * derived fields, and killing it mid-pass leaves the collection in a state no
 * step is responsible for repairing. The process exits when it returns.
 */
export function stopOrganizer(): void {
    stopping = true;
    if (timer !== undefined) clearTimeout(timer);
}

async function runNightly(): Promise<RunSummary> {
    const startedAt = Date.now();
    const failed: string[] = [];
    let steps = 0;

    /** Run one step, keeping its result and never letting it abandon the rest. */
    const step = async <T>(name: string, work: () => Promise<T>, fallback: T): Promise<T> => {
        const at = Date.now();
        steps += 1;

        try {
            const result = await work();
            logger.info({ step: name, ms: Date.now() - at }, 'Step complete');
            return result;
        } catch (err) {
            failed.push(name);
            logger.error({ err, step: name, ms: Date.now() - at }, 'Step failed');
            return fallback;
        }
    };

    logger.info('Nightly run started');
    let universe = await activeUniverse();

    // Prices first: everything below is derived from the bars this writes
    const prices = await step('prices', () => updateDailyPrices(universe), NO_PRICES);

    await step('splits', () => applySplits(prices.splits), 0);
    await step('dividends', () => applyDividends(prices.dividends), 0);
    await step('weekly', () => updateCurrentWeek(), 0);

    // The delisting scan needs tonight's bars, and every step after it should
    // skip the symbols it just retired rather than compute figures for them
    await step(
        'delist',
        async () => {
            universe = stillListed(universe, await markDelisted(universe));
        },
        undefined,
    );

    await step('fundamentals', () => updateFundamentals(universe), 0);
    await step('metrics', () => updateDailyMetrics(universe), 0);
    await step('valuations', () => updateValuations(), 0);
    await step('marketStats', () => updateMarketStats(), undefined);
    await step('holidays', () => updateHolidays(), 0);
    await step('calendar', () => updateCalendar(), 0);
    await step('news', () => updateNews(universe), 0);
    await step('prune', () => pruneIntraday(), 0);

    const summary = { steps, failed, durationMs: Date.now() - startedAt };
    if (failed.length === 0) logger.info(summary, 'Nightly run complete');
    else logger.error(summary, 'Nightly run finished with failures');

    return summary;
}
