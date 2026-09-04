/** The market overview contract — the shape `/api/market/stats` answers with. */

/** The universe a breadth figure was measured over. `all` is every asset. */
export type BreadthUniverse = (typeof BREADTH_UNIVERSES)[number];

export type OutlookTerm = (typeof OUTLOOK_TERMS)[number];

export type OutlookVerdict = 'bullish' | 'neutral' | 'bearish';

export type IndexPerformance = {
    symbol: string;
    lastPrice: number | null;
    oneDay: number | null;
    oneMonth: number | null;
    fourMonth: number | null;
    oneYear: number | null;
    yearToDate: number | null;
};

/** How much of a universe sits above its moving average, as a fraction of 1. */
export type MovingAverageBreadth = {
    period: number;
    above: number;
    below: number;
};

export type OutlookReading = {
    term: OutlookTerm;
    verdict: OutlookVerdict;
    percentUp: number;
    periods: number[];
};

/** Fractions of the measured universe; advancing/declining/unchanged add to 1, as do the three below them. */
export type BreadthSplit = {
    advancing: number;
    declining: number;
    unchanged: number;
    newHighs: number;
    newLows: number;
    neutral: number;
};

export type TierRow = {
    name: string;
    averageReturn: number;
    count: number;
};

export type MoverRow = {
    symbol: string;
    dailyReturn: number;
};

export type ValuationRow = {
    symbol: string;
    currentPrice: number;
    intrinsicValue: number;
    gap: number;
};

export type MarketOverview = {
    updatedAt: string | null;
    indexes: IndexPerformance[];
    outlook: OutlookReading[];
    breadth: BreadthSplit;
    movingAverages: Record<BreadthUniverse, MovingAverageBreadth[]>;
    sectors: TierRow[];
    industries: TierRow[];
    gainers: MoverRow[];
    losers: MoverRow[];
    undervalued: ValuationRow[];
    overvalued: ValuationRow[];
};

export const BREADTH_UNIVERSES = ['all', 'stock', 'etf', 'fund', 'otc', 'pink', 'crypto'] as const;

/** The three horizons the outlook is reported over, shortest first. */
export const OUTLOOK_TERMS = ['short', 'mid', 'long'] as const;
