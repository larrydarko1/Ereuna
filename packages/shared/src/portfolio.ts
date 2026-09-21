/**
 * The portfolio contract — what `/api/portfolios` answers with and accepts.
 * The trade log is the only thing stored; every figure below is replayed from
 * it server-side, which is why nothing here is meant to be computed in the
 * browser. Dates are ISO 8601 strings.
 */
import type { PortfolioStatsSnapshot, PortfolioValuePoint, PositionSide, TradeAction } from '#db/collections.js';

/**
 * One trade as the client writes it, and as an export hands it back.
 * `shares` and `price` are omitted on a cash movement rather than zeroed: a
 * deposit that names a share count is a malformed deposit, and an export has to
 * round-trip through the import that rejects one.
 */
export type TradeInput = {
    action: TradeAction;
    symbol?: string | null; // Null for `deposit` and `withdrawal`, which move cash and name no instrument
    shares?: number;
    price?: number;
    total: number;
    commission?: number; // Omitted to take the portfolio's default
    tradeDate: string;
};

export type TradeRow = {
    id: string;
    symbol: string | null;
    action: TradeAction;
    shares: number;
    price: number;
    total: number;
    commission: number;
    tradeDate: string;
    createdAt: string;
};

export type TradePage = {
    items: TradeRow[];
    total: number;
    page: number;
    limit: number;
};

export type ValuedPosition = {
    symbol: string;
    side: PositionSide;
    shares: number;
    avgPrice: number;
    lastClose: number | null; // Null when the ingestor has no bar for the symbol yet
    marketValue: number | null; // Absolute value — a short's is what buying it back would cost
    exposure: number | null; // Signed contribution to equity: negative for a short
    unrealizedPL: number | null;
    unrealizedPLPercent: number | null;
    weight: number | null; // Share of gross exposure, in percent
};

export type BenchmarkResult = {
    symbol: string;
    inceptionPrice: number;
    currentPrice: number;
    returnPercent: number;
    portfolioReturnPercent: number;
    outperformance: number;
};

export type PortfolioSummary = {
    number: number;
    cash: number; // Negative means the portfolio carries a margin loan
    baseValue: number;
    leverage: number;
    defaultCommission: number;
    positions: ValuedPosition[];
    longValue: number;
    shortValue: number;
    grossExposure: number; // Longs plus shorts — what the leverage limit is measured against
    netExposure: number; // Longs minus shorts — what market direction is measured against
    totalValue: number; // Equity: cash plus net exposure
    leverageUsed: number | null;
    buyingPower: number; // What is left before the leverage limit binds
    unrealizedPL: number;
    totalPL: number | null;
    totalPLPercent: number | null;
    stats: PortfolioStatsSnapshot | null;
    valueHistory: PortfolioValuePoint[];
    benchmarks: BenchmarkResult[];
};

/** The export envelope, which is also exactly what the import accepts — the file a user downloads is a file they can upload. */
export type PortfolioExport = {
    portfolio: {
        baseValue: number;
        leverage: number;
        defaultCommission: number;
        benchmarks: string[];
        stats: PortfolioStatsSnapshot | null;
        valueHistory: PortfolioValuePoint[];
    };
    trades: TradeInput[];
};
