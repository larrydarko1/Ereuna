/**
 * Request schemas for /api/watchlists. See requests/identity.ts for how the API
 * and the frontend share them.
 */
import { z } from 'zod';

import { LIMITS } from '#limits.js';
import { resourceNameField, symbolField } from '#requests/fields.js';

/** POST /watchlists and PATCH /watchlists/:name: the list's name, new or changed. */
export const watchlistNameBody = z.object({ name: resourceNameField });

/** POST /watchlists/:name/tickers */
export const addTickerBody = z.object({ symbol: symbolField });

/** PUT /watchlists/order — every list, in the order to show them. */
export const watchlistOrderBody = z.object({
    names: z.array(resourceNameField).max(LIMITS.watchlistsPerUser),
});

/** PUT /watchlists/:name/tickers — every ticker in the list, in the order to show them. */
export const tickerOrderBody = z.object({ symbols: z.array(symbolField).max(LIMITS.tickersPerWatchlist) });
