/**
 * Translate the ingestor's `marketStats` document into the MarketOverview
 * contract. Pure: the document in, the response shape out.
 */
import {
    BREADTH_UNIVERSES,
    OUTLOOK_TERMS,
    type BreadthSplit,
    type BreadthUniverse,
    type IndexPerformance,
    type MarketOverview,
    type MovingAverageBreadth,
    type MoverRow,
    type OutlookReading,
    type OutlookTerm,
    type OutlookVerdict,
    type StatsDoc,
    type TierRow,
    type ValuationRow,
} from '@ereuna/shared';

/** The ingestor's asset-type keys, in the order the universes are declared. */
const UNIVERSE_KEYS: Record<BreadthUniverse, string> = {
    all: 'ALL',
    stock: 'Stock',
    etf: 'ETF',
    fund: 'Mutual Fund',
    otc: 'OTC',
    pink: 'PINK',
    crypto: 'Crypto',
};

/** The periods the ingestor publishes, shortest first. */
const MA_PERIODS = [5, 10, 20, 50, 100, 150, 200];

const TERM_KEYS: Record<OutlookTerm, string> = { short: 'shortTerm', mid: 'midTerm', long: 'longTerm' };

const VERDICTS: OutlookVerdict[] = ['bullish', 'neutral', 'bearish'];

export function toMarketOverview(doc: StatsDoc): MarketOverview {
    return {
        updatedAt: readDate(doc.updatedAt),
        indexes: readIndexes(record(doc.indexPerformance)),
        outlook: readOutlook(record(doc.marketOutlook)),
        breadth: readBreadth(record(doc.advanceDecline), record(doc.newHighsLows)),
        movingAverages: readMovingAverages(doc),
        sectors: readTier(doc.sectorTierList, 'sector'),
        industries: readTier(doc.industryTierList, 'industry'),
        gainers: readMovers(doc.top10DailyGainers),
        losers: readMovers(doc.top10DailyLosers),
        undervalued: readValuations(doc.top10Undervalued),
        overvalued: readValuations(doc.top10Overvalued),
    };
}

function record(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function num(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string | null {
    return typeof value === 'string' && value !== '' ? value : null;
}

function readDate(value: unknown): string | null {
    if (value instanceof Date) return value.toISOString();
    // The driver hands back a Date, but an export/restore round trip can leave
    // the extended-JSON string behind, and both mean the same instant.
    const raw = text(value);
    if (raw === null) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function readIndexes(source: Record<string, unknown>): IndexPerformance[] {
    return Object.entries(source).map(([symbol, value]) => {
        const row = record(value);
        return {
            symbol,
            lastPrice: num(row.lastPrice),
            oneDay: num(row['1D']),
            oneMonth: num(row['1M']),
            fourMonth: num(row['4M']),
            oneYear: num(row['1Y']),
            yearToDate: num(row.YTD),
        };
    });
}

function readOutlook(source: Record<string, unknown>): OutlookReading[] {
    const readings: OutlookReading[] = [];

    for (const term of OUTLOOK_TERMS) {
        const row = record(source[TERM_KEYS[term]]);
        const verdict = text(row.outlook);
        const percentUp = num(row.percentageUp);
        if (verdict === null || percentUp === null) continue;
        if (!VERDICTS.includes(verdict as OutlookVerdict)) continue;

        readings.push({
            term,
            verdict: verdict as OutlookVerdict,
            percentUp,
            // The ingestor names the periods "SMA5", "SMA10" — the dashboard
            // shows them as a list of numbers, so they are parsed once here.
            periods: (Array.isArray(row.smas) ? row.smas : [])
                .map((name) => Number.parseInt(String(name).replace(/\D+/gu, ''), 10))
                .filter((period) => Number.isFinite(period)),
        });
    }

    return readings;
}

function readBreadth(advanceDecline: Record<string, unknown>, newHighsLows: Record<string, unknown>): BreadthSplit {
    return {
        advancing: num(advanceDecline.advancing) ?? 0,
        declining: num(advanceDecline.declining) ?? 0,
        unchanged: num(advanceDecline.unchanged) ?? 0,
        newHighs: num(newHighsLows.newHighs) ?? 0,
        newLows: num(newHighsLows.newLows) ?? 0,
        neutral: num(newHighsLows.neutral) ?? 0,
    };
}

function readMovingAverages(doc: StatsDoc): Record<BreadthUniverse, MovingAverageBreadth[]> {
    const out = {} as Record<BreadthUniverse, MovingAverageBreadth[]>;

    for (const universe of BREADTH_UNIVERSES) {
        const rows: MovingAverageBreadth[] = [];

        for (const period of MA_PERIODS) {
            const bucket = record(record(doc[`SMA${period}`])[UNIVERSE_KEYS[universe]]);
            const above = num(bucket.up);
            const below = num(bucket.down);
            if (above === null || below === null) continue;
            rows.push({ period, above, below });
        }

        out[universe] = rows;
    }

    return out;
}

function readTier(value: unknown, nameField: string): TierRow[] {
    if (!Array.isArray(value)) return [];

    return value.flatMap((entry) => {
        const row = record(entry);
        const name = text(row[nameField]);
        const averageReturn = num(row.average_return);
        const count = num(row.count);
        if (name === null || averageReturn === null || count === null) return [];
        return [{ name, averageReturn, count }];
    });
}

function readMovers(value: unknown): MoverRow[] {
    if (!Array.isArray(value)) return [];

    return value.flatMap((entry) => {
        const row = record(entry);
        const symbol = text(row.symbol);
        const dailyReturn = num(row.daily_return);
        if (symbol === null || dailyReturn === null) return [];
        return [{ symbol, dailyReturn }];
    });
}

function readValuations(value: unknown): ValuationRow[] {
    if (!Array.isArray(value)) return [];

    return value.flatMap((entry) => {
        const row = record(entry);
        const symbol = text(row.symbol);
        const currentPrice = num(row.current_price);
        const intrinsicValue = num(row.intrinsic_value);
        if (symbol === null || currentPrice === null || intrinsicValue === null || currentPrice <= 0) return [];
        // The document carries `valuation_ratio`, a percentage that runs to
        // five figures on a penny stock. The gap is derived here instead so
        // the two sides of the panel are the same measure with opposite signs.
        return [{ symbol, currentPrice, intrinsicValue, gap: intrinsicValue / currentPrice - 1 }];
    });
}
