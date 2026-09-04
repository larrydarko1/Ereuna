/**
 * The dashboard's `marketStats` document: breadth, tier lists, index
 * performance and the day's extremes.
 */
import type { AssetInfoDoc, StatsDoc } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { PRIMARY_EXCHANGES } from '@/organize/universe.js';
import { numeric, round } from '@/utils/indicators.js';

type Row = {
    symbol: string;
    assetType: string;
    exchange: string;
    sector: string;
    industry: string;
    close: number | null;
    marketCap: number | null;
    todayChange: number | null;
    quarterChange: number | null;
    intrinsicValue: number | null;
    week52High: number | null;
    week52Low: number | null;
    movingAverages: Map<number, number | null>;
    performance: Record<string, number | null>;
    updatedAt: Date | null;
};

/** The moving-average periods the breadth panel reports. */
const MA_PERIODS = [5, 10, 20, 50, 100, 150, 200] as const;

/** The asset classes breadth is broken down by, and what puts a symbol in one. */
const UNIVERSES = ['ALL', 'Stock', 'ETF', 'Mutual Fund', 'OTC', 'PINK', 'Crypto'] as const;

/** The benchmarks whose performance the dashboard header shows. */
const INDEXES = ['SPY', 'QQQ', 'DIA', 'IWM', 'EFA', 'EEM'];

const MOVERS = 10;

/** A single-day move beyond this is a data error, not a market event. */
const MAX_DAILY_MOVE = 2;

/** Fewer members than this and a sector's average is one company's news. */
const MIN_TIER_MEMBERS = 2;

const OUTLOOK_TERMS = [
    { key: 'shortTerm', periods: [5, 10, 20] },
    { key: 'midTerm', periods: [50, 100] },
    { key: 'longTerm', periods: [150, 200] },
] as const;

export async function updateMarketStats(): Promise<void> {
    const rows = await load();
    if (rows.length === 0) {
        logger.warn('Market stats skipped: no assets carry metrics yet');
        return;
    }

    const priced = rows.filter((row) => row.close !== null);
    const movingAverages = breadthByUniverse(priced);

    const document: StatsDoc = {
        _id: 'marketStats',
        ...Object.fromEntries(MA_PERIODS.map((period) => [`SMA${period}`, movingAverages[period] ?? {}])),
        marketOutlook: outlook(movingAverages),
        advanceDecline: advanceDecline(priced),
        newHighsLows: newHighsLows(priced),
        sectorTierList: sectorTiers(priced),
        industryTierList: industryTiers(priced),
        indexPerformance: indexPerformance(priced),
        top10DailyGainers: movers(priced, 'desc'),
        top10DailyLosers: movers(priced, 'asc'),
        top10Undervalued: valuations(priced, 'desc'),
        top10Overvalued: valuations(priced, 'asc'),
        updatedAt: latestBar(rows) ?? undefined,
    };

    await getDb().collection<StatsDoc>('Stats').updateOne({ _id: 'marketStats' }, { $set: document }, { upsert: true });
    logger.info({ assets: priced.length }, 'Market stats updated');
}

async function load(): Promise<Row[]> {
    const docs = await getDb()
        .collection<AssetInfoDoc>('AssetInfo')
        .find(
            { Delisted: { $ne: true } },
            {
                projection: {
                    _id: 0,
                    Symbol: 1,
                    AssetType: 1,
                    Exchange: 1,
                    Sector: 1,
                    Industry: 1,
                    MarketCapitalization: 1,
                    IntrinsicValue: 1,
                    'TimeSeries.close': 1,
                    todaychange: 1,
                    quarterchange: 1,
                    '1mchange': 1,
                    '4mchange': 1,
                    '1ychange': 1,
                    ytdchange: 1,
                    fiftytwoWeekHigh: 1,
                    fiftytwoWeekLow: 1,
                    metricsUpdatedAt: 1,
                    ...Object.fromEntries(MA_PERIODS.map((period) => [`MA${period}`, 1])),
                },
            },
        )
        .toArray();

    return docs.map(toRow);
}

function toRow(doc: AssetInfoDoc): Row {
    const updatedAt = doc.metricsUpdatedAt;

    return {
        symbol: doc.Symbol,
        assetType: typeof doc.AssetType === 'string' ? doc.AssetType : '',
        exchange: typeof doc.Exchange === 'string' ? doc.Exchange : '',
        sector: typeof doc.Sector === 'string' ? doc.Sector : '',
        industry: typeof doc.Industry === 'string' ? doc.Industry : '',
        close: numeric((doc.TimeSeries as { close?: unknown } | undefined)?.close),
        marketCap: numeric(doc.MarketCapitalization),
        todayChange: numeric(doc.todaychange),
        quarterChange: numeric(doc.quarterchange),
        intrinsicValue: numeric(doc.IntrinsicValue),
        week52High: numeric(doc.fiftytwoWeekHigh),
        week52Low: numeric(doc.fiftytwoWeekLow),
        movingAverages: new Map(MA_PERIODS.map((period) => [period, numeric(doc[`MA${period}`])])),
        performance: {
            '1D': numeric(doc.todaychange),
            '1M': numeric(doc['1mchange']),
            '4M': numeric(doc['4mchange']),
            '1Y': numeric(doc['1ychange']),
            YTD: numeric(doc.ytdchange),
        },
        updatedAt: updatedAt instanceof Date ? updatedAt : null,
    };
}

/** Whether a symbol belongs in one of the breadth universes. */
function inUniverse(row: Row, universe: (typeof UNIVERSES)[number]): boolean {
    switch (universe) {
        case 'ALL':
            return true;
        case 'Stock':
            return row.assetType === 'Stock' && PRIMARY_EXCHANGES.includes(row.exchange);
        case 'OTC':
            return row.assetType === 'Stock' && !PRIMARY_EXCHANGES.includes(row.exchange) && row.exchange !== 'PINK';
        case 'PINK':
            return row.assetType === 'Stock' && row.exchange === 'PINK';
        default:
            return row.assetType === universe;
    }
}

/**
 * The share of each universe trading above each moving average.
 * The universes are partitioned once and every period reuses the partition.
 */
function breadthByUniverse(rows: readonly Row[]): Record<number, Record<string, { up: number; down: number }>> {
    const partitions = new Map(UNIVERSES.map((universe) => [universe, rows.filter((row) => inUniverse(row, universe))]));
    const breadth: Record<number, Record<string, { up: number; down: number }>> = {};

    for (const period of MA_PERIODS) {
        const byUniverse: Record<string, { up: number; down: number }> = {};

        for (const [universe, members] of partitions) {
            let up = 0;
            let down = 0;

            for (const row of members) {
                const average = row.movingAverages.get(period);
                if (average === null || average === undefined || row.close === null) continue;
                if (row.close > average) up += 1;
                else down += 1;
            }

            const total = up + down;
            byUniverse[universe] = total === 0 ? { up: 0, down: 0 } : { up: up / total, down: down / total };
        }

        breadth[period] = byUniverse;
    }

    return breadth;
}

/**
 * Short, mid and long-term readings from how much of the market is above its
 * averages. `bullish` and `bearish`, which is the vocabulary the dashboard
 * renders — the Python wrote `positive` and `negative`, which the translator
 * does not recognise, so the outlook panel has never had anything to show.
 */
function outlook(breadth: Record<number, Record<string, { up: number; down: number }>>): Record<string, unknown> {
    const reading: Record<string, unknown> = {};

    for (const { key, periods } of OUTLOOK_TERMS) {
        const average = periods.reduce((sum, period) => sum + (breadth[period]?.ALL?.up ?? 0), 0) / periods.length;

        reading[key] = {
            outlook: average >= 0.7 ? 'bullish' : average >= 0.5 ? 'neutral' : 'bearish',
            percentageUp: round(average * 100, 2),
            smas: periods.map((period) => `SMA${period}`),
        };
    }

    return reading;
}

function advanceDecline(rows: readonly Row[]): Record<string, number> {
    const stocks = rows.filter((row) => row.assetType === 'Stock' && row.todayChange !== null);
    const advancing = stocks.filter((row) => (row.todayChange ?? 0) > 0).length;
    const declining = stocks.filter((row) => (row.todayChange ?? 0) < 0).length;
    const unchanged = stocks.length - advancing - declining;

    return share({ advancing, declining, unchanged });
}

/**
 * How much of the market is making new 52-week extremes.
 */
function newHighsLows(rows: readonly Row[]): Record<string, number> {
    const stocks = rows.filter((row) => row.assetType === 'Stock' && row.week52High !== null && row.week52Low !== null);
    const newHighs = stocks.filter((row) => (row.close ?? 0) >= (row.week52High ?? Infinity)).length;
    const newLows = stocks.filter((row) => (row.close ?? 0) <= (row.week52Low ?? -Infinity)).length;
    const neutral = stocks.length - newHighs - newLows;

    return share({ newHighs, newLows, neutral });
}

/** Sector returns, weighted by market capitalisation. */
function sectorTiers(rows: readonly Row[]): Record<string, unknown>[] {
    return tiers(rows, 'sector', (members) => {
        const capital = members.reduce((sum, row) => sum + (row.marketCap ?? 0), 0);
        if (capital === 0) return null;
        return members.reduce((sum, row) => sum + (row.quarterChange ?? 0) * (row.marketCap ?? 0), 0) / capital;
    });
}

/** Industry returns, as a median — an industry is a handful of names, and one of them is usually an outlier. */
function industryTiers(rows: readonly Row[]): Record<string, unknown>[] {
    return tiers(rows, 'industry', (members) => median(members.map((row) => row.quarterChange ?? 0)));
}

function tiers(
    rows: readonly Row[],
    field: 'sector' | 'industry',
    reduce: (members: Row[]) => number | null,
): Record<string, unknown>[] {
    const eligible = rows.filter(
        (row) => row[field] !== '' && row.quarterChange !== null && (row.marketCap ?? 0) > 0 && PRIMARY_EXCHANGES.includes(row.exchange),
    );

    const groups = new Map<string, Row[]>();
    for (const row of eligible) {
        const members = groups.get(row[field]) ?? [];
        members.push(row);
        groups.set(row[field], members);
    }

    return [...groups]
        .flatMap(([name, members]) => {
            if (members.length < MIN_TIER_MEMBERS) return [];
            const averageReturn = reduce(members);
            return averageReturn === null ? [] : [{ [field]: name, average_return: averageReturn, count: members.length }];
        })
        .sort((left, right) => (right.average_return as number) - (left.average_return as number));
}

function indexPerformance(rows: readonly Row[]): Record<string, unknown> {
    const performance: Record<string, unknown> = {};

    for (const row of rows) {
        if (!INDEXES.includes(row.symbol)) continue;
        performance[row.symbol] = { lastPrice: row.close, ...row.performance };
    }

    return performance;
}

/** The day's biggest moves on the primary exchanges, as percentages. */
function movers(rows: readonly Row[], direction: 'asc' | 'desc'): Record<string, unknown>[] {
    const eligible = rows.filter(
        (row) => PRIMARY_EXCHANGES.includes(row.exchange) && row.todayChange !== null && Math.abs(row.todayChange) <= MAX_DAILY_MOVE,
    );

    return sortBy(eligible, (row) => row.todayChange ?? 0, direction)
        .slice(0, MOVERS)
        .map((row) => ({ symbol: row.symbol, daily_return: round((row.todayChange ?? 0) * 100, 2) }));
}

/** The widest gaps between the discounted-cash-flow value and the traded price. */
function valuations(rows: readonly Row[], direction: 'asc' | 'desc'): Record<string, unknown>[] {
    const eligible = rows.filter(
        (row) =>
            row.assetType === 'Stock' &&
            PRIMARY_EXCHANGES.includes(row.exchange) &&
            row.intrinsicValue !== null &&
            row.intrinsicValue > 0 &&
            (row.close ?? 0) > 0,
    );

    return sortBy(eligible, (row) => (row.intrinsicValue ?? 0) / (row.close ?? 1) - 1, direction)
        .slice(0, MOVERS)
        .map((row) => ({
            symbol: row.symbol,
            current_price: round(row.close, 2),
            intrinsic_value: round(row.intrinsicValue, 2),
        }));
}

/**
 * The newest bar the run has seen, which is what dates the document.
 */
function latestBar(rows: readonly Row[]): Date | null {
    let newest: Date | null = null;
    for (const row of rows) {
        if (row.updatedAt !== null && (newest === null || row.updatedAt > newest)) newest = row.updatedAt;
    }
    return newest;
}

function share(counts: Record<string, number>): Record<string, number> {
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    if (total === 0) return Object.fromEntries(Object.keys(counts).map((key) => [key, 0]));
    return Object.fromEntries(Object.entries(counts).map(([key, count]) => [key, count / total]));
}

function sortBy<T>(rows: readonly T[], value: (row: T) => number, direction: 'asc' | 'desc'): T[] {
    const sign = direction === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => sign * (value(left) - value(right)));
}

function median(values: readonly number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[middle] ?? null;
    return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
