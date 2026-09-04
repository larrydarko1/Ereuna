/** Everything derived from a symbol's own daily bars, computed in one pass. */
import type { AnyBulkWriteOperation } from 'mongodb';
import type { AssetInfoDoc } from '@ereuna/shared';
import { logger } from '@/lib/logger.js';
import { dailySeries, lifetimeStats, type LifetimeStats, type Series } from '@/organize/bars.js';
import { generateSignals } from '@/organize/signals.js';
import { chunk, type Asset } from '@/organize/universe.js';
import { setOn, writeAssetInfo } from '@/organize/write.js';
import { averageDailyVolatility, cagr, changeOver, extremes, MIN_CAGR_YEARS, round, rsi, sma } from '@/utils/indicators.js';

type Ranking = { symbol: string; change: number };

/** Symbols loaded per batch. Bounds how many series are held at once. */
const BATCH_SIZE = 400;

/** Trading days in each window. A year is 252 sessions, not 365 days. */
const WEEK = 5;
const MONTH = 21;
const QUARTER = 63;
const FOUR_MONTHS = 84;
const SIX_MONTHS = 126;
const YEAR = 252;
const MA_PERIODS = [5, 10, 20, 50, 100, 150, 200] as const;

/** The windows relative strength is ranked over, and the field each writes. */
const RS_WINDOWS = [
    { bars: WEEK, field: 'RSScore1W' },
    { bars: MONTH, field: 'RSScore1M' },
    { bars: FOUR_MONTHS, field: 'RSScore4M' },
] as const;

/**
 * Recompute every per-symbol figure and write it back to `AssetInfo`.
 * Returns the number of symbols that had enough history to produce anything.
 */
export async function updateDailyMetrics(universe: readonly Asset[]): Promise<number> {
    const lifetime = await lifetimeStats();
    const rankings = new Map<string, Ranking[]>(RS_WINDOWS.map((window) => [window.field, []]));
    let covered = 0;

    for (const batch of chunk(universe, BATCH_SIZE)) {
        const series = await dailySeries(batch.map((asset) => asset.symbol));
        const operations: AnyBulkWriteOperation<AssetInfoDoc>[] = [];

        for (const asset of batch) {
            const bars = series.get(asset.symbol);
            if (bars === undefined || bars.closes.length === 0) continue;

            covered += 1;
            operations.push(setOn(asset.symbol, metricsFor(asset, bars, lifetime.get(asset.symbol))));

            for (const { bars: window, field } of RS_WINDOWS) {
                const change = changeOver(bars.closes, window);
                if (change !== null) rankings.get(field)?.push({ symbol: asset.symbol, change });
            }
        }

        await writeAssetInfo(operations);
    }

    await writeRelativeStrength(rankings);
    logger.info({ covered, universe: universe.length }, 'Daily metrics updated');
    return covered;
}

/** Every field derived from one symbol's bars. */
function metricsFor(asset: Asset, bars: Series, lifetime: LifetimeStats | undefined): Record<string, unknown> {
    const { closes, highs, lows, volumes, timestamps } = bars;
    const close = closes[closes.length - 1] ?? 0;
    const latest = timestamps[timestamps.length - 1];

    const marketCap = asset.sharesOutstanding === null ? null : close * asset.sharesOutstanding;
    const window52 = closes.length < YEAR ? closes.length : YEAR;
    const high52 = extremes(highs.slice(highs.length - window52)).high;
    const low52 = extremes(lows.slice(lows.length - window52)).low;

    return {
        TimeSeries: {
            open: round(closes.length === 0 ? null : (bars.opens[bars.opens.length - 1] ?? null), 2),
            high: round(highs[highs.length - 1] ?? null, 2),
            low: round(lows[lows.length - 1] ?? null, 2),
            close: round(close, 2),
            volume: round(volumes[volumes.length - 1] ?? null, 2),
        },
        MarketCapitalization: marketCap,
        RSI: round(rsi(closes), 2),
        Gap: round(percent(changeOver(closes, 1)), 2),

        ...Object.fromEntries(MA_PERIODS.map((period) => [`MA${period}`, round(sma(closes, period), 2)])),

        AvgVolume1W: whole(sma(volumes, WEEK)),
        AvgVolume1M: whole(sma(volumes, MONTH)),
        AvgVolume6M: whole(sma(volumes, SIX_MONTHS)),
        AvgVolume1Y: whole(sma(volumes, YEAR)),
        RelVolume1W: relativeVolume(volumes, WEEK),
        RelVolume1M: relativeVolume(volumes, MONTH),
        RelVolume6M: relativeVolume(volumes, SIX_MONTHS),
        RelVolume1Y: relativeVolume(volumes, YEAR),

        ADV1W: round(averageDailyVolatility(closes, WEEK), 4),
        ADV1M: round(averageDailyVolatility(closes, MONTH), 4),
        ADV4M: round(averageDailyVolatility(closes, FOUR_MONTHS), 4),
        ADV1Y: round(averageDailyVolatility(closes, YEAR), 4),

        todaychange: round(changeOver(closes, 1), 4),
        weekchange: round(changeOver(closes, WEEK), 4),
        '1mchange': round(changeOver(closes, MONTH), 4),
        quarterchange: round(changeOver(closes, QUARTER), 4),
        '4mchange': round(changeOver(closes, FOUR_MONTHS), 4),
        '6mchange': round(changeOver(closes, SIX_MONTHS), 4),
        '1ychange': round(changeOver(closes, YEAR), 4),
        ytdchange: round(yearToDate(bars), 4),

        AlltimeHigh: lifetime?.high ?? high52,
        AlltimeLow: lifetime?.low ?? low52,
        fiftytwoWeekHigh: high52,
        fiftytwoWeekLow: low52,
        percoff52WeekHigh: offExtreme(close, high52),
        percoff52WeekLow: offExtreme(close, low52),

        ...growthSinceListing(lifetime),

        Signals: generateSignals(bars),
        metricsUpdatedAt: latest ?? null,
    };
}

/**
 * Today's volume against its own average, to one decimal.
 * The average excludes today, so a quiet day is not flattered by being part of
 * the baseline it is measured against.
 */
function relativeVolume(volumes: readonly number[], period: number): number | null {
    if (volumes.length < period + 1) return null;
    const current = volumes[volumes.length - 1];
    const baseline = sma(volumes.slice(0, volumes.length - 1), period);
    if (current === undefined || baseline === null || baseline === 0) return null;
    return round(current / baseline, 1);
}

/**
 * Change from this year's first close, or null before the year's first bar.
 * Anchored to the first session of the calendar year rather than to a fixed
 * number of bars back, which is the whole point of a year-to-date figure.
 */
function yearToDate(bars: Series): number | null {
    const { timestamps, closes } = bars;
    const close = closes[closes.length - 1];
    const year = timestamps[timestamps.length - 1]?.getUTCFullYear();
    if (close === undefined || year === undefined) return null;

    for (let index = 0; index < timestamps.length; index += 1) {
        if (timestamps[index]?.getUTCFullYear() !== year) continue;
        const first = closes[index];
        return first === undefined || first === 0 ? null : (close - first) / first;
    }

    return null;
}

/** Compound growth since the first bar on record, with the span it covers. */
function growthSinceListing(lifetime: LifetimeStats | undefined): Record<string, number | null> {
    if (lifetime === undefined) return { CAGR: null, CAGRYears: null };

    const days = (lifetime.lastTimestamp.getTime() - lifetime.firstTimestamp.getTime()) / 86_400_000;
    const years = days / 365.25;
    const rate = cagr(lifetime.firstClose, lifetime.lastClose, years);

    return {
        CAGR: round(rate, 4),
        CAGRYears: years < MIN_CAGR_YEARS ? null : round(years, 2),
    };
}

/** How far the last close sits from an extreme, as a fraction of that extreme. */
function offExtreme(close: number, extreme: number | null): number | null {
    if (extreme === null || extreme === 0) return null;
    return round((close - extreme) / extreme, 4);
}

function percent(value: number | null): number | null {
    return value === null ? null : value * 100;
}

function whole(value: number | null): number | null {
    return value === null ? null : Math.round(value);
}

/**
 * Rank each window's returns into a 1–100 percentile and write the scores.
 */
async function writeRelativeStrength(rankings: ReadonlyMap<string, Ranking[]>): Promise<void> {
    const operations: AnyBulkWriteOperation<AssetInfoDoc>[] = [];

    for (const [field, rows] of rankings) {
        if (rows.length === 0) continue;
        const sorted = [...rows].sort((left, right) => left.change - right.change);

        for (const [index, row] of sorted.entries()) {
            operations.push(setOn(row.symbol, { [field]: Math.floor((index / sorted.length) * 100) + 1 }));
        }
    }

    await writeAssetInfo(operations);
}
