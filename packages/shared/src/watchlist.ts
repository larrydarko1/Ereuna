/**
 * The watchlist contract — the shapes `/api/watchlists` answers with.
 * An entry whose symbol has no bar yet carries `quote: null` rather than being
 * dropped, so a symbol the ingestor has not reached stays in the list the user
 * built. Timestamps are ISO 8601 strings.
 */
import type { WatchlistEntry } from '#db/collections.js';

export type WatchlistSummary = {
    id: string;
    name: string;
    position: number;
    tickerCount: number;
    tickers: string[]; // Membership, so "add to list" can be offered without reading every list
    updatedAt: string;
};

export type Quote = {
    symbol: string;
    close: number;
    timestamp: string;
    previousClose: number | null;
    change: number | null;
    changePercent: number | null;
};

export type WatchlistRow = WatchlistEntry & {
    quote: Quote | null;
};
