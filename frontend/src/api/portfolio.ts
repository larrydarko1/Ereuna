/**
 * portfolio — API wrappers for /api/portfolios.
 * A portfolio is event-sourced: the trade log is the only thing stored, and
 * positions, cash, value history and statistics are all replayed from it after
 * every write. Nothing here writes a derived figure — see `trades.ts` for the
 * calls that actually change a portfolio.
 * The one exception is `importPortfolio`, which may carry a declared `stats`
 * and `valueHistory`. Ereuna simulates: a user bringing in a track record their
 * log cannot reproduce is stating it, and stating it is their prerogative.
 * The import is sent as the text of the file the user chose: what each trade
 * and the settings say is the server's to judge, against the same schema the
 * export answers with.
 */
import type { AnswerOf, PortfolioExport, PortfolioSummary } from '@ereuna/shared';

import { call, type ApiResult } from '@/api/client';

export function getPortfolios(): ApiResult<AnswerOf<'GET /api/portfolios'>> {
    return call('GET /api/portfolios');
}

export function getPortfolio(number: number): ApiResult<PortfolioSummary> {
    return call('GET /api/portfolios/:number', { params: { number } });
}

export function deletePortfolio(number: number): ApiResult<void> {
    return call('DELETE /api/portfolios/:number', { params: { number } });
}

export function setBaseValue(
    number: number,
    baseValue: number,
): ApiResult<AnswerOf<'PUT /api/portfolios/:number/base-value'>> {
    return call('PUT /api/portfolios/:number/base-value', { params: { number }, body: { baseValue } });
}

/**
 * Set the gross exposure limit. Lowering it replays the whole log against the
 * new ceiling and is refused when the book already held no longer fits, so this
 * can fail on a portfolio that has not been touched in months.
 */
export function setLeverage(
    number: number,
    leverage: number,
): ApiResult<AnswerOf<'PUT /api/portfolios/:number/leverage'>> {
    return call('PUT /api/portfolios/:number/leverage', { params: { number }, body: { leverage } });
}

/** The commission written onto a trade that does not carry its own. Changing it
 *  never re-prices a trade already in the log — those settled at write time. */
export function setDefaultCommission(
    number: number,
    commission: number,
): ApiResult<AnswerOf<'PUT /api/portfolios/:number/commission'>> {
    return call('PUT /api/portfolios/:number/commission', { params: { number }, body: { commission } });
}

export function setBenchmarks(
    number: number,
    symbols: readonly string[],
): ApiResult<AnswerOf<'PUT /api/portfolios/:number/benchmarks'>> {
    return call('PUT /api/portfolios/:number/benchmarks', { params: { number }, body: { symbols: [...symbols] } });
}

export function exportPortfolio(number: number): ApiResult<PortfolioExport> {
    return call('GET /api/portfolios/:number/export', { params: { number } });
}

/**
 * Replace the trade log wholesale with the one in `json`, a file's text.
 * Everything already in the slot is discarded. Answers with the number of trades accepted, not a
 * summary: the replay has already run, so the caller re-reads `getPortfolio`
 * for the settled state.
 */
export function importPortfolio(
    number: number,
    json: string,
): ApiResult<AnswerOf<'POST /api/portfolios/:number/import'>> {
    return call('POST /api/portfolios/:number/import', { params: { number }, json });
}
