/**
 * watchlist — API wrappers for /api/watchlists.
 * Lists are addressed by name, not id: the name is what the user typed and what
 * the URL shows, and it is unique per user by index.
 * An entry whose symbol has no bar yet comes back with `quote: null` rather
 * than being dropped — a symbol the ingestor has not reached should still be
 * visible in the list the user built.
 */
import type { WatchlistEntry } from '@ereuna/shared';
import { api, type ApiResult } from '@/api/client';

export type Quote = {
    symbol: string;
    close: number;
    timestamp: string;
    previousClose: number | null;
    change: number | null;
    changePercent: number | null;
};

export type WatchlistSummary = {
    id: string;
    name: string;
    position: number;
    tickerCount: number;
    updatedAt: string;
};

export type WatchlistRow = WatchlistEntry & {
    quote: Quote | null;
};

export type WatchlistDetail = {
    name: string;
    rows: WatchlistRow[];
};

export function listWatchlists(): ApiResult<{ items: WatchlistSummary[] }> {
    return api.get<{ items: WatchlistSummary[] }>('/watchlists');
}

export function createWatchlist(name: string): ApiResult<WatchlistSummary> {
    return api.post<WatchlistSummary>('/watchlists', { name });
}

export function reorderWatchlists(names: readonly string[]): ApiResult<{ items: WatchlistSummary[] }> {
    return api.put<{ items: WatchlistSummary[] }>('/watchlists/order', { names });
}

export function getWatchlist(name: string): ApiResult<WatchlistDetail> {
    return api.get<WatchlistDetail>(`/watchlists/${encodeURIComponent(name)}`);
}

export function renameWatchlist(name: string, newName: string): ApiResult<WatchlistSummary> {
    return api.patch<WatchlistSummary>(`/watchlists/${encodeURIComponent(name)}`, { name: newName });
}

export function deleteWatchlist(name: string): ApiResult<{ ok: true }> {
    return api.delete<{ ok: true }>(`/watchlists/${encodeURIComponent(name)}`);
}

export function reorderTickers(name: string, tickers: readonly string[]): ApiResult<{ list: WatchlistEntry[] }> {
    return api.put<{ list: WatchlistEntry[] }>(`/watchlists/${encodeURIComponent(name)}/tickers`, { tickers });
}

export function addTicker(name: string, symbol: string): ApiResult<{ list: WatchlistEntry[] }> {
    return api.post<{ list: WatchlistEntry[] }>(`/watchlists/${encodeURIComponent(name)}/tickers`, { symbol });
}

export function removeTicker(name: string, symbol: string): ApiResult<{ list: WatchlistEntry[] }> {
    return api.delete<{ list: WatchlistEntry[] }>(
        `/watchlists/${encodeURIComponent(name)}/tickers/${encodeURIComponent(symbol)}`,
    );
}
