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
import type { TradeAction } from '@ereuna/shared';
import { api, type ApiResult } from '@/api/client';

export type TradeInput = {
    action: TradeAction;
    symbol?: string | null; // Null for `deposit` and `withdrawal`, which move cash and name no instrument.
    shares?: number;
    price?: number;
    total: number;
    commission?: number;
    tradeDate: string; // ISO 8601
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

export type TradeQuery = {
    page?: number;
    limit?: number;
    symbol?: string;
};

export function getTrades(number: number, query: TradeQuery = {}): ApiResult<TradePage> {
    return api.get<TradePage>(`/portfolios/${number}/trades`, { params: query });
}

export function addTrade(number: number, trade: TradeInput): ApiResult<TradeRow> {
    return api.post<TradeRow>(`/portfolios/${number}/trades`, trade);
}

export function updateTrade(number: number, id: string, trade: TradeInput): ApiResult<TradeRow> {
    return api.patch<TradeRow>(`/portfolios/${number}/trades/${id}`, trade);
}

export function deleteTrade(number: number, id: string): ApiResult<void> {
    return api.delete<void>(`/portfolios/${number}/trades/${id}`);
}
