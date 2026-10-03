/**
 * Response schemas for /api/watchlists (see responses/identity.ts for how
 * `send()` uses them). An entry whose symbol has no bar yet carries
 * `quote: null` rather than being dropped, so a symbol the ingestor has not
 * reached stays in the list the user built. Timestamps are ISO 8601 strings.
 */
import { z } from 'zod';

const watchlistEntrySchema = z.object({
    ticker: z.string(),
    exchange: z.string(),
});

/** POST /watchlists (201) and PATCH /watchlists/:name, and one row of the list. */
export const watchlistSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number().int().nonnegative(),
    tickerCount: z.number().int().nonnegative(),
    tickers: z.array(z.string()), // Membership, so "add to list" can be offered without reading every list
    updatedAt: z.string(),
});

/** GET /watchlists and PUT /watchlists/order — every list, in the user's order. */
export const watchlistListSchema = z.object({ items: z.array(watchlistSummarySchema) });

/** The latest close against the one before it — a watchlist row's figures, and what the API caches per symbol. */
export const quoteSchema = z.object({
    symbol: z.string(),
    close: z.number(),
    timestamp: z.string(),
    previousClose: z.number().nullable(),
    change: z.number().nullable(),
    changePercent: z.number().nullable(),
});

const watchlistRowSchema = watchlistEntrySchema.extend({ quote: quoteSchema.nullable() });

/** GET /watchlists/:name */
export const watchlistDetailSchema = z.object({
    name: z.string(),
    rows: z.array(watchlistRowSchema),
});

/** PUT, POST and DELETE /watchlists/:name/tickers — the list's entries after the change. */
export const watchlistEntriesSchema = z.object({ list: z.array(watchlistEntrySchema) });

export type WatchlistSummary = z.infer<typeof watchlistSummarySchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type WatchlistRow = z.infer<typeof watchlistRowSchema>;
export type WatchlistDetail = z.infer<typeof watchlistDetailSchema>;
