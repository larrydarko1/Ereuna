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
import type {
    baseValueSchema,
    benchmarksSchema,
    defaultCommissionSchema,
    importResultSchema,
    leverageSchema,
    PortfolioExport,
    portfolioListSchema,
    PortfolioSummary,
    ResponseBody,
} from '@ereuna/shared';

import { api, type ApiResult } from '@/api/client';

/**
 * A portfolio file as the user chose it. The client checks only that it holds a
 * list of trades; what each trade and the settings say is the server's to judge.
 */
export type PortfolioImport = {
    trades: unknown[];
    portfolio?: unknown;
};

export function getPortfolios(): ApiResult<ResponseBody<typeof portfolioListSchema>> {
    return api.get<ResponseBody<typeof portfolioListSchema>>('/portfolios');
}

export function getPortfolio(number: number): ApiResult<PortfolioSummary> {
    return api.get<PortfolioSummary>(`/portfolios/${number}`);
}

export function deletePortfolio(number: number): ApiResult<void> {
    return api.delete<void>(`/portfolios/${number}`);
}

export function setBaseValue(number: number, baseValue: number): ApiResult<ResponseBody<typeof baseValueSchema>> {
    return api.put<ResponseBody<typeof baseValueSchema>>(`/portfolios/${number}/base-value`, { baseValue });
}

/**
 * Set the gross exposure limit. Lowering it replays the whole log against the
 * new ceiling and is refused when the book already held no longer fits, so this
 * can fail on a portfolio that has not been touched in months.
 */
export function setLeverage(number: number, leverage: number): ApiResult<ResponseBody<typeof leverageSchema>> {
    return api.put<ResponseBody<typeof leverageSchema>>(`/portfolios/${number}/leverage`, { leverage });
}

/** The commission written onto a trade that does not carry its own. Changing it
 *  never re-prices a trade already in the log — those settled at write time. */
export function setDefaultCommission(
    number: number,
    commission: number,
): ApiResult<ResponseBody<typeof defaultCommissionSchema>> {
    return api.put<ResponseBody<typeof defaultCommissionSchema>>(`/portfolios/${number}/commission`, { commission });
}

export function setBenchmarks(
    number: number,
    symbols: readonly string[],
): ApiResult<ResponseBody<typeof benchmarksSchema>> {
    return api.put<ResponseBody<typeof benchmarksSchema>>(`/portfolios/${number}/benchmarks`, { symbols });
}

export function exportPortfolio(number: number): ApiResult<PortfolioExport> {
    return api.get<PortfolioExport>(`/portfolios/${number}/export`);
}

/**
 * Replace the trade log wholesale. Everything already in the slot is discarded.
 * Answers with the number of trades accepted, not a summary: the replay has
 * already run, so the caller re-reads `getPortfolio` for the settled state.
 */
export function importPortfolio(
    number: number,
    payload: PortfolioImport,
): ApiResult<ResponseBody<typeof importResultSchema>> {
    return api.post<ResponseBody<typeof importResultSchema>>(`/portfolios/${number}/import`, payload);
}
