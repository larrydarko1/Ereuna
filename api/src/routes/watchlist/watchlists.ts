/**
 * Watchlist routes — mounted at /api/watchlists (all require authentication)
 * GET    /api/watchlists                          — the user's lists, in display order
 * POST   /api/watchlists                          — create a list
 * PUT    /api/watchlists/order                    — set the display order of the lists
 * GET    /api/watchlists/:name                    — one list with a quote per entry
 * PATCH  /api/watchlists/:name                    — rename a list
 * DELETE /api/watchlists/:name                    — delete a list
 * PUT    /api/watchlists/:name/tickers            — set the ticker order within a list
 * POST   /api/watchlists/:name/tickers            — add a ticker
 * DELETE /api/watchlists/:name/tickers/:symbol    — remove a ticker
 */
import { Router } from 'express';
import { z } from 'zod';

import {
    watchlistDetailSchema,
    watchlistEntriesSchema,
    watchlistListSchema,
    watchlistSummarySchema,
} from '@ereuna/shared';

import { config } from '@/lib/config.js';
import { resourceNameSchema, symbolSchema } from '@/lib/schemas.js';
import { send } from '@/lib/send.js';
import { authedUserId } from '@/middleware/auth.js';
import { validated } from '@/middleware/validate.js';
import * as watchlistService from '@/services/watchlist/index.js';

const nameParam = z.object({ name: resourceNameSchema });
const tickerParams = z.object({ name: resourceNameSchema, symbol: symbolSchema });

const createBody = z.object({ name: resourceNameSchema });
const renameBody = z.object({ name: resourceNameSchema });
const addTickerBody = z.object({ symbol: symbolSchema });

const orderBody = z.object({ names: z.array(resourceNameSchema).max(config.limits.watchlistsPerUser) });
const tickerOrderBody = z.object({ symbols: z.array(symbolSchema).max(config.limits.tickersPerWatchlist) });

export const router = Router();

router.get(
    '/',
    ...validated({}, async (req, res): Promise<void> => {
        send(res, watchlistListSchema, { items: await watchlistService.listWatchlists(authedUserId(req)) });
    }),
);

router.post(
    '/',
    ...validated({ body: createBody }, async (req, res): Promise<void> => {
        send(
            res.status(201),
            watchlistSummarySchema,
            await watchlistService.createWatchlist(authedUserId(req), req.body.name),
        );
    }),
);

/** Registered before `/:name` so `order` is not read as a watchlist name. */
router.put(
    '/order',
    ...validated({ body: orderBody }, async (req, res): Promise<void> => {
        const items = await watchlistService.reorderWatchlists(authedUserId(req), req.body.names);
        send(res, watchlistListSchema, { items });
    }),
);

router.get(
    '/:name',
    ...validated({ params: nameParam }, async (req, res): Promise<void> => {
        send(res, watchlistDetailSchema, await watchlistService.getWatchlistRows(authedUserId(req), req.params.name));
    }),
);

router.patch(
    '/:name',
    ...validated({ params: nameParam, body: renameBody }, async (req, res): Promise<void> => {
        const summary = await watchlistService.renameWatchlist(authedUserId(req), req.params.name, req.body.name);
        send(res, watchlistSummarySchema, summary);
    }),
);

router.delete(
    '/:name',
    ...validated({ params: nameParam }, async (req, res): Promise<void> => {
        await watchlistService.deleteWatchlist(authedUserId(req), req.params.name);
        res.status(204).end();
    }),
);

router.put(
    '/:name/tickers',
    ...validated({ params: nameParam, body: tickerOrderBody }, async (req, res): Promise<void> => {
        const list = await watchlistService.reorderTickers(authedUserId(req), req.params.name, req.body.symbols);
        send(res, watchlistEntriesSchema, { list });
    }),
);

router.post(
    '/:name/tickers',
    ...validated({ params: nameParam, body: addTickerBody }, async (req, res): Promise<void> => {
        const list = await watchlistService.addTicker(authedUserId(req), req.params.name, req.body.symbol);
        send(res.status(201), watchlistEntriesSchema, { list });
    }),
);

router.delete(
    '/:name/tickers/:symbol',
    ...validated({ params: tickerParams }, async (req, res): Promise<void> => {
        const list = await watchlistService.removeTicker(authedUserId(req), req.params.name, req.params.symbol);
        send(res, watchlistEntriesSchema, { list });
    }),
);
