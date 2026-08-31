/**
 * Market routes — mounted at /api/market (all require authentication)
 * GET /api/market/stats               — the ingested market summary, with its own ingest timestamp
 * GET /api/market/holidays            — the exchange holiday calendar
 * GET /api/market/symbols             — every symbol and its exchange
 * GET /api/market/news                — headlines, optionally narrowed to symbols and a date
 * GET /api/market/calendar            — earnings, dividends and splits for one day
 * GET /api/market/:symbol/financials  — annual and quarterly statements
 * Everything here is read-only ingested data, cached per read. There is no
 * separate "last update" endpoint: that timestamp is a field on `stats`, and
 * formatting it for display is the client's job, not a route's.
 */
import { Router } from 'express';
import { z } from 'zod';
import { config } from '@/lib/config.js';
import { symbolSchema } from '@/lib/schemas.js';
import { validated } from '@/middleware/validate.js';
import * as marketService from '@/services/market/index.js';
import { lastTradingDay } from '@/utils/market-hours.js';

const symbolListSchema = z
    .string()
    .transform((value) => value.split(',').map((part) => part.trim().toUpperCase()).filter((part) => part !== ''))
    .pipe(z.array(symbolSchema).max(config.limits.symbolsPerRequest));

const newsQuery = z.object({
    symbols: symbolListSchema.optional(),
    since: z.iso.date().or(z.literal('all')).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const calendarQuery = z.object({ date: z.iso.date() });
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

router.get(
    '/symbols',
    ...validated({}, async (_req, res): Promise<void> => {
        res.json({ items: await marketService.symbolIndex() });
    }),
);

router.get(
    '/news',
    ...validated({ query: newsQuery }, async (req, res): Promise<void> => {
        const { symbols, since, limit } = req.validatedQuery;
        res.json({
            items: await marketService.news({
                ...(symbols !== undefined ? { symbols } : {}),
                ...(since === 'all' ? {} : { since: since === undefined ? lastTradingDay() : new Date(since) }),
                limit,
            }),
        });
    }),
);

router.get(
    '/calendar',
    ...validated({ query: calendarQuery }, async (req, res): Promise<void> => {
        res.json(await marketService.dayCalendar(new Date(`${req.validatedQuery.date}T00:00:00Z`)));
    }),
);

// Registered last, so the fixed paths above are never shadowed by a symbol.
router.get(
    '/:symbol/financials',
    ...validated({ params: symbolParam }, async (req, res): Promise<void> => {
        res.json(await marketService.financials(req.params.symbol));
    }),
);
