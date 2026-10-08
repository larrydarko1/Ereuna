/**
 * watchlist — API wrappers for /api/watchlists.
 * Lists are addressed by name, not id: the name is what the user typed and what
 * the URL shows, and it is unique per user by index.
 * An entry whose symbol has no bar yet comes back with `quote: null` rather
 * than being dropped — a symbol the ingestor has not reached should still be
 * visible in the list the user built.
 */
import type { AnswerOf, WatchlistDetail, WatchlistSummary } from '@ereuna/shared';

import { call, type ApiResult } from '@/api/client';

type WatchlistList = AnswerOf<'GET /api/watchlists'>;

type WatchlistEntries = AnswerOf<'POST /api/watchlists/:name/tickers'>;

export function getWatchlists(): ApiResult<WatchlistList> {
    return call('GET /api/watchlists');
}

export function createWatchlist(name: string): ApiResult<WatchlistSummary> {
    return call('POST /api/watchlists', { body: { name } });
}

export function reorderWatchlists(names: readonly string[]): ApiResult<WatchlistList> {
    return call('PUT /api/watchlists/order', { body: { names: [...names] } });
}

export function getWatchlist(name: string): ApiResult<WatchlistDetail> {
    return call('GET /api/watchlists/:name', { params: { name } });
}

export function renameWatchlist(name: string, newName: string): ApiResult<WatchlistSummary> {
    return call('PATCH /api/watchlists/:name', { params: { name }, body: { name: newName } });
}

export function deleteWatchlist(name: string): ApiResult<void> {
    return call('DELETE /api/watchlists/:name', { params: { name } });
}

export function reorderTickers(name: string, symbols: readonly string[]): ApiResult<WatchlistEntries> {
    return call('PUT /api/watchlists/:name/tickers', { params: { name }, body: { symbols: [...symbols] } });
}

export function addTicker(name: string, symbol: string): ApiResult<WatchlistEntries> {
    return call('POST /api/watchlists/:name/tickers', { params: { name }, body: { symbol } });
}

export function removeTicker(name: string, symbol: string): ApiResult<WatchlistEntries> {
    return call('DELETE /api/watchlists/:name/tickers/:symbol', { params: { name, symbol } });
}
