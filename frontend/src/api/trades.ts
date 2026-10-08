/**
 * trades — API wrappers for /api/portfolios/:number/trades.
 * The trade log is the portfolio's single source of truth, so every call here
 * triggers a full replay server-side. That is also why a write can fail for a
 * reason that has nothing to do with the trade being written: editing a trade
 * from last year can leave a later one without the buying power it needed.
 * `short` and `cover` are their own actions rather than a sell running past
 * zero — the log records what the user meant, so covering more than is short is
 * a rejectable mistake instead of a silent flip into a long.
 */
import type { BodyOf, QueryOf, TradePage, TradeRow } from '@ereuna/shared';

import { call, type ApiResult } from '@/api/client';

/** One trade or cash movement, as the API takes it. */
type TradeBody = BodyOf<'POST /api/portfolios/:number/trades'>;

export function getTrades(
    number: number,
    query: QueryOf<'GET /api/portfolios/:number/trades'> = {},
): ApiResult<TradePage> {
    return call('GET /api/portfolios/:number/trades', { params: { number }, query });
}

export function addTrade(number: number, trade: TradeBody): ApiResult<TradeRow> {
    return call('POST /api/portfolios/:number/trades', { params: { number }, body: trade });
}

export function updateTrade(number: number, id: string, trade: TradeBody): ApiResult<TradeRow> {
    return call('PATCH /api/portfolios/:number/trades/:id', { params: { number, id }, body: trade });
}

export function deleteTrade(number: number, id: string): ApiResult<void> {
    return call('DELETE /api/portfolios/:number/trades/:id', { params: { number, id } });
}
