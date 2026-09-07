/**
 * Market routes — mounted at /api/market (all require authentication)
 * GET /api/market/stats               — the ingested market summary, with its own ingest timestamp
 * GET /api/market/holidays            — the exchange holiday calendar
 * GET /api/market/:symbol/financials  — annual and quarterly statements
 * Everything here is read-only ingested data, cached per read. There is no
 * separate "last update" endpoint: that timestamp is a field on `stats`, and
 * formatting it for display is the client's job, not a route's. There is no
 * symbol index either — shipping the whole universe so the browser can filter
 * it is what `/api/charts/search` replaced.
 */
import { Router } from 'express';
import { z } from 'zod';
import { symbolSchema } from '@/lib/schemas.js';
import { validated } from '@/middleware/validate.js';
import * as marketService from '@/services/market/index.js';

const symbolParam = z.object({ symbol: symbolSchema });

export const router = Router();

router.get(
    '/stats',
    ...validated({}, async (_req, res): Promise<void> => {
        res.json(await marketService.marketStats());
    }),
);

router.get(
    '/holidays',
    ...validated({}, async (_req, res): Promise<void> => {
        res.json(await marketService.holidays());
    }),
);

// Registered last, so the fixed paths above are never shadowed by a symbol.
router.get(
    '/:symbol/financials',
    ...validated({ params: symbolParam }, async (req, res): Promise<void> => {
        res.json(await marketService.financials(req.params.symbol));
    }),
);
