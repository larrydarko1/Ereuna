/**
 * Chart routes — mounted at /api/charts (all require authentication)
 * GET    /api/charts/search                    — asset search for the symbol picker
 * GET    /api/charts/:symbol                   — bars, volume and the user's overlays
 * GET    /api/charts/:symbol/profile           — the reference data the summary sidebar shows
 * GET    /api/charts/:symbol/events            — earnings, split and dividend markers
 * GET    /api/charts/:symbol/drawings          — saved annotations for one timeframe
 * PUT    /api/charts/:symbol/drawings          — save annotations for one timeframe
 * DELETE /api/charts/:symbol/drawings          — clear annotations for one timeframe
 * Chart settings are a user preference, not a chart resource: they are read and
 * written through /api/preferences.
 */
import { Router } from 'express';
import { z } from 'zod';
import { CHART_TIMEFRAMES } from '@ereuna/shared';
import { config } from '@/lib/config.js';
import { symbolSchema } from '@/lib/schemas.js';
import { authedUserId } from '@/middleware/auth.js';
import { validated } from '@/middleware/validate.js';
import * as chartService from '@/services/chart/index.js';
import * as marketService from '@/services/market/index.js';

/** Corporate-action markers returned by default; `all=true` returns the full history. */
const DEFAULT_EVENT_LIMIT = 4;
const MAX_EVENT_LIMIT = 500;

const symbolParam = z.object({ symbol: symbolSchema });

const timeframeQuery = z.object({
    timeframe: z.enum(CHART_TIMEFRAMES).default('daily'),
});

const seriesQuery = timeframeQuery.extend({
    before: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
});

const eventsQuery = z.object({ all: z.stringbool().default(false) });

const searchQuery = z.object({
    q: z.string().trim().min(1, 'A search term is required').max(60),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Item geometry belongs to the renderer, so items are stored opaquely and only counted. */
const drawingItems = z.array(z.unknown()).max(config.limits.drawingsPerKind).default([]);

const drawingsBody = z.object({
    trendLines: drawingItems,
    boxes: drawingItems,
    textAnnotations: drawingItems,
    freehandPaths: drawingItems,
    priceLevels: drawingItems,
});

export const router = Router();

/** Registered before `/:symbol` so `search` is not read as a ticker. */
router.get(
    '/search',
    ...validated({ query: searchQuery }, async (req, res): Promise<void> => {
        const { q, limit } = req.validatedQuery;
        res.json({ items: await marketService.searchAssets(q, limit) });
    }),
);

router.get(
    '/:symbol',
    ...validated({ params: symbolParam, query: seriesQuery }, async (req, res): Promise<void> => {
        const { timeframe, before } = req.validatedQuery;
        res.json(
            await chartService.getChartSeries(authedUserId(req), req.params.symbol, timeframe, {
                ...(before !== undefined ? { before: new Date(before) } : {}),
            }),
        );
    }),
);

router.get(
    '/:symbol/profile',
    ...validated({ params: symbolParam }, async (req, res): Promise<void> => {
        res.json(await marketService.assetProfile(req.params.symbol));
    }),
);

router.get(
    '/:symbol/events',
    ...validated({ params: symbolParam, query: eventsQuery }, async (req, res): Promise<void> => {
        const { symbol } = req.params;
        const limit = req.validatedQuery.all ? MAX_EVENT_LIMIT : DEFAULT_EVENT_LIMIT;

        const [earnings, dividends, splits] = await Promise.all([
            marketService.earningsDates(symbol),
            marketService.corporateActions(symbol, 'dividends', limit),
            marketService.corporateActions(symbol, 'splits', limit),
        ]);

        res.json({ earnings, dividends, splits });
    }),
);

router.get(
    '/:symbol/drawings',
    ...validated({ params: symbolParam, query: timeframeQuery }, async (req, res): Promise<void> => {
        const drawings = await chartService.getDrawings(
            authedUserId(req),
            req.params.symbol,
            req.validatedQuery.timeframe,
        );
        res.json(drawings);
    }),
);

router.put(
    '/:symbol/drawings',
    ...validated({ params: symbolParam, query: timeframeQuery, body: drawingsBody }, async (req, res): Promise<void> => {
        const drawings = await chartService.saveDrawings(
            authedUserId(req),
            req.params.symbol,
            req.validatedQuery.timeframe,
            req.body,
        );
        res.json(drawings);
    }),
);

router.delete(
    '/:symbol/drawings',
    ...validated({ params: symbolParam, query: timeframeQuery }, async (req, res): Promise<void> => {
        await chartService.clearDrawings(authedUserId(req), req.params.symbol, req.validatedQuery.timeframe);
        res.json({ ok: true });
    }),
);
