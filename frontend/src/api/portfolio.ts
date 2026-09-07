/**
 * portfolio — API wrappers for /api/portfolios.
 * A portfolio is event-sourced: the trade log is the only thing stored, and
 * positions, cash, value history and statistics are all replayed from it after
 * every write. Nothing here writes a derived figure — see `trades.ts` for the
 * calls that actually change a portfolio.
 * The one exception is `importPortfolio`, which may carry a declared `stats`
 * and `valueHistory`. Ereuna simulates: a user bringing in a track record their
 * log cannot reproduce is stating it, and stating it is their prerogative.
 */
import type { PortfolioStatsSnapshot, PortfolioValuePoint, PositionSide } from '@ereuna/shared';
import { api, type ApiResult } from '@/api/client';
import type { TradeInput } from '@/api/trades';

export type PortfolioRow = {
    number: number;
    cash: number;
    baseValue: number;
    leverage: number;
    defaultCommission: number;
    benchmarks: string[];
    positionCount: number;
    updatedAt: string;
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

/**
 * The export envelope, which is also exactly what `importPortfolio` accepts —
 * the trades come back as `TradeInput`, not as rows, so the file the user
 * downloads is a file the user can upload.
 */
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

export type PortfolioImport = {
    trades: TradeInput[];
    portfolio?: Partial<PortfolioExport['portfolio']>;
};

export function getPortfolios(): ApiResult<{ items: PortfolioRow[] }> {
    return api.get<{ items: PortfolioRow[] }>('/portfolios');
}

export function getPortfolio(number: number): ApiResult<PortfolioSummary> {
    return api.get<PortfolioSummary>(`/portfolios/${number}`);
}

export function deletePortfolio(number: number): ApiResult<void> {
    return api.delete<void>(`/portfolios/${number}`);
}

export function setBaseValue(number: number, baseValue: number): ApiResult<{ baseValue: number }> {
    return api.put<{ baseValue: number }>(`/portfolios/${number}/base-value`, { baseValue });
}

/**
 * Set the gross exposure limit. Lowering it replays the whole log against the
 * new ceiling and is refused when the book already held no longer fits, so this
 * can fail on a portfolio that has not been touched in months.
 */
export function setLeverage(number: number, leverage: number): ApiResult<{ leverage: number }> {
    return api.put<{ leverage: number }>(`/portfolios/${number}/leverage`, { leverage });
}

/** The commission written onto a trade that does not carry its own. Changing it
 *  never re-prices a trade already in the log — those settled at write time. */
export function setDefaultCommission(number: number, commission: number): ApiResult<{ defaultCommission: number }> {
    return api.put<{ defaultCommission: number }>(`/portfolios/${number}/commission`, { commission });
}

export function setBenchmarks(number: number, symbols: readonly string[]): ApiResult<{ benchmarks: string[] }> {
    return api.put<{ benchmarks: string[] }>(`/portfolios/${number}/benchmarks`, { symbols });
}

export function exportPortfolio(number: number): ApiResult<PortfolioExport> {
    return api.get<PortfolioExport>(`/portfolios/${number}/export`);
}

/**
 * Replace the trade log wholesale. Everything already in the slot is discarded.
 * Answers with the number of trades accepted, not a summary: the replay has
 * already run, so the caller re-reads `getPortfolio` for the settled state.
 */
export function importPortfolio(number: number, payload: PortfolioImport): ApiResult<{ imported: number }> {
    return api.post<{ imported: number }>(`/portfolios/${number}/import`, payload);
}
