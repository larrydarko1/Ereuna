/**
 * Portfolio routes — mounted at /api/portfolios (all require authentication)
 * GET    /api/portfolios                     — every slot the user has opened
 * GET    /api/portfolios/:number             — the valued summary of one slot
 * DELETE /api/portfolios/:number             — delete a slot and its trades
 * PUT    /api/portfolios/:number/base-value  — set the reference capital
 * PUT    /api/portfolios/:number/leverage    — set the gross exposure limit
 * PUT    /api/portfolios/:number/commission  — set the default per-trade commission
 * PUT    /api/portfolios/:number/benchmarks  — set the comparison symbols
 * GET    /api/portfolios/:number/export      — the trade log plus the current summary
 * POST   /api/portfolios/:number/import      — replace the trade log from an export
 * Trades live on the same prefix and are mounted from `trades.ts`.
 */
import { Router } from 'express';

import {
    baseValueBody,
    baseValueSchema,
    benchmarksBody,
    benchmarksSchema,
    commissionBody,
    defaultCommissionSchema,
    importBody,
    importResultSchema,
    leverageBody,
    leverageSchema,
    portfolioExportSchema,
    portfolioListSchema,
    portfolioParam,
    portfolioSummarySchema,
} from '@ereuna/shared';

import { send } from '@/lib/send.js';
import { authedUserId } from '@/middleware/auth.js';
import { validated } from '@/middleware/validate.js';
import { toTradeFields } from '@/routes/portfolio/trades.js';
import * as portfolioService from '@/services/portfolio/index.js';

export const router = Router();

router.get(
    '/',
    ...validated({}, async (req, res): Promise<void> => {
        send(res, portfolioListSchema, { items: await portfolioService.listPortfolios(authedUserId(req)) });
    }),
);

router.get(
    '/:number',
    ...validated({ params: portfolioParam }, async (req, res): Promise<void> => {
        send(res, portfolioSummarySchema, await portfolioService.getSummary(authedUserId(req), req.params.number));
    }),
);

router.delete(
    '/:number',
    ...validated({ params: portfolioParam }, async (req, res): Promise<void> => {
        await portfolioService.deletePortfolio(authedUserId(req), req.params.number);
        res.status(204).end();
    }),
);

router.put(
    '/:number/base-value',
    ...validated({ params: portfolioParam, body: baseValueBody }, async (req, res): Promise<void> => {
        const portfolio = await portfolioService.setBaseValue(authedUserId(req), req.params.number, req.body.baseValue);
        send(res, baseValueSchema, { baseValue: portfolio.baseValue });
    }),
);

router.put(
    '/:number/leverage',
    ...validated({ params: portfolioParam, body: leverageBody }, async (req, res): Promise<void> => {
        const leverage = await portfolioService.setLeverage(authedUserId(req), req.params.number, req.body.leverage);
        send(res, leverageSchema, { leverage });
    }),
);

router.put(
    '/:number/commission',
    ...validated({ params: portfolioParam, body: commissionBody }, async (req, res): Promise<void> => {
        const defaultCommission = await portfolioService.setDefaultCommission(
            authedUserId(req),
            req.params.number,
            req.body.commission,
        );
        send(res, defaultCommissionSchema, { defaultCommission });
    }),
);

router.put(
    '/:number/benchmarks',
    ...validated({ params: portfolioParam, body: benchmarksBody }, async (req, res): Promise<void> => {
        const benchmarks = await portfolioService.setBenchmarks(authedUserId(req), req.params.number, req.body.symbols);
        send(res, benchmarksSchema, { benchmarks });
    }),
);

router.get(
    '/:number/export',
    ...validated({ params: portfolioParam }, async (req, res): Promise<void> => {
        send(res, portfolioExportSchema, await portfolioService.exportPortfolio(authedUserId(req), req.params.number));
    }),
);

router.post(
    '/:number/import',
    ...validated({ params: portfolioParam, body: importBody }, async (req, res): Promise<void> => {
        const declared = req.body.portfolio ?? {};

        const imported = await portfolioService.replaceTrades(
            authedUserId(req),
            req.params.number,
            req.body.trades.map(toTradeFields),
            {
                settings: {
                    ...(declared.baseValue !== undefined ? { baseValue: declared.baseValue } : {}),
                    ...(declared.leverage !== undefined ? { leverage: declared.leverage } : {}),
                    ...(declared.defaultCommission !== undefined
                        ? { defaultCommission: declared.defaultCommission }
                        : {}),
                    ...(declared.benchmarks !== undefined ? { benchmarks: declared.benchmarks } : {}),
                },
                declared: {
                    ...(declared.stats !== undefined && declared.stats !== null ? { stats: declared.stats } : {}),
                    ...(declared.valueHistory !== undefined ? { valueHistory: declared.valueHistory } : {}),
                },
            },
        );

        send(res, importResultSchema, { imported });
    }),
);
