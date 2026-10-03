/**
 * watchlist — API wrappers for /api/watchlists.
 * Lists are addressed by name, not id: the name is what the user typed and what
 * the URL shows, and it is unique per user by index.
 * An entry whose symbol has no bar yet comes back with `quote: null` rather
 * than being dropped — a symbol the ingestor has not reached should still be
 * visible in the list the user built.
 */
import type {
    ResponseBody,
    WatchlistDetail,
    watchlistEntriesSchema,
    watchlistListSchema,
    WatchlistSummary,
} from '@ereuna/shared';

import { api, type ApiResult } from '@/api/client';

export function getWatchlists(): ApiResult<ResponseBody<typeof watchlistListSchema>> {
    return api.get<ResponseBody<typeof watchlistListSchema>>('/watchlists');
}

export function createWatchlist(name: string): ApiResult<WatchlistSummary> {
    return api.post<WatchlistSummary>('/watchlists', { name });
}

export function reorderWatchlists(names: readonly string[]): ApiResult<ResponseBody<typeof watchlistListSchema>> {
    return api.put<ResponseBody<typeof watchlistListSchema>>('/watchlists/order', { names });
}

export function getWatchlist(name: string): ApiResult<WatchlistDetail> {
    return api.get<WatchlistDetail>(`/watchlists/${encodeURIComponent(name)}`);
}

export function renameWatchlist(name: string, newName: string): ApiResult<WatchlistSummary> {
    return api.patch<WatchlistSummary>(`/watchlists/${encodeURIComponent(name)}`, { name: newName });
}

export function deleteWatchlist(name: string): ApiResult<void> {
    return api.delete<void>(`/watchlists/${encodeURIComponent(name)}`);
}

export function reorderTickers(
    name: string,
    symbols: readonly string[],
): ApiResult<ResponseBody<typeof watchlistEntriesSchema>> {
    return api.put<ResponseBody<typeof watchlistEntriesSchema>>(`/watchlists/${encodeURIComponent(name)}/tickers`, {
        symbols,
    });
}

export function addTicker(name: string, symbol: string): ApiResult<ResponseBody<typeof watchlistEntriesSchema>> {
    return api.post<ResponseBody<typeof watchlistEntriesSchema>>(`/watchlists/${encodeURIComponent(name)}/tickers`, {
        symbol,
    });
}

export function removeTicker(name: string, symbol: string): ApiResult<ResponseBody<typeof watchlistEntriesSchema>> {
    return api.delete<ResponseBody<typeof watchlistEntriesSchema>>(
        `/watchlists/${encodeURIComponent(name)}/tickers/${encodeURIComponent(symbol)}`,
    );
}
