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
import { z } from 'zod';
import { config } from '@/lib/config.js';
import { portfolioNumberSchema, symbolSchema } from '@/lib/schemas.js';
import { authedUserId } from '@/middleware/auth.js';
import { validated } from '@/middleware/validate.js';
import * as portfolioService from '@/services/portfolio/index.js';
import { tradeInputSchema, toTradeInput } from '@/routes/portfolio/trades.js';

const numberParam = z.object({ number: portfolioNumberSchema });

const baseValueBody = z.object({ baseValue: z.number().finite().nonnegative().max(1e12) });
const leverageBody = z.object({ leverage: z.number().finite().min(1).max(config.limits.maxLeverage) });
const commissionBody = z.object({
    commission: z.number().finite().nonnegative().max(config.limits.maxCommission),
});
const benchmarksBody = z.object({ symbols: z.array(symbolSchema).max(config.limits.benchmarksPerPortfolio) });

const extremeSchema = z.object({
    ticker: z.string().max(32),
    amount: z.number().finite(),
    tradeCount: z.number().int().nonnegative(),
});

const finite = z.number().finite();
const nullableFinite = z.number().finite().nullable();

const statsSchema = z.object({
    realizedPL: finite,
    realizedPLPercent: finite,
    winnerCount: z.number().int().nonnegative(),
    loserCount: z.number().int().nonnegative(),
    breakevenCount: z.number().int().nonnegative(),
    winnerPercent: finite,
    loserPercent: finite,
    breakevenPercent: finite,
    avgGain: finite,
    avgLoss: finite,
    avgGainAbs: finite,
    avgLossAbs: finite,
    avgPositionSize: finite,
    avgHoldTimeWinners: finite,
    avgHoldTimeLosers: finite,
    gainLossRatio: nullableFinite,
    profitFactor: nullableFinite,
    riskRewardRatio: nullableFinite,
    sortinoRatio: nullableFinite,
    totalCommission: finite,
    longCount: z.number().int().nonnegative(),
    shortCount: z.number().int().nonnegative(),
    biggestWinner: extremeSchema.nullable(),
    biggestLoser: extremeSchema.nullable(),
    tradeReturnsChart: z.object({
        bins: z
            .array(
                z.object({
                    min: finite,
                    max: finite,
                    range: z.string().max(64),
                    count: z.number().int().nonnegative(),
                    positive: z.boolean(),
                }),
            )
            .max(500),
        medianBinIndex: z.number().int().min(-1),
    }),
});

const valueHistorySchema = z.array(z.object({ date: z.iso.date(), value: finite })).max(config.limits.importRows);

const importBody = z.object({
    trades: z.array(tradeInputSchema).max(config.limits.importRows),
    portfolio: z
        .object({
            baseValue: z.number().finite().nonnegative().max(1e12).optional(),
            leverage: z.number().finite().min(1).max(config.limits.maxLeverage).optional(),
            defaultCommission: z.number().finite().nonnegative().max(config.limits.maxCommission).optional(),
            benchmarks: z.array(symbolSchema).max(config.limits.benchmarksPerPortfolio).optional(),
            stats: statsSchema.nullish(),
            valueHistory: valueHistorySchema.optional(),
        })
        .optional(),
});

export const router = Router();

router.get(
    '/',
    ...validated({}, async (req, res): Promise<void> => {
        res.json({ items: await portfolioService.listPortfolios(authedUserId(req)) });
    }),
);

router.get(
    '/:number',
    ...validated({ params: numberParam }, async (req, res): Promise<void> => {
        res.json(await portfolioService.getSummary(authedUserId(req), req.params.number));
    }),
);

router.delete(
    '/:number',
    ...validated({ params: numberParam }, async (req, res): Promise<void> => {
        await portfolioService.deletePortfolio(authedUserId(req), req.params.number);
        res.json({ ok: true });
    }),
);

router.put(
    '/:number/base-value',
    ...validated({ params: numberParam, body: baseValueBody }, async (req, res): Promise<void> => {
        const portfolio = await portfolioService.setBaseValue(authedUserId(req), req.params.number, req.body.baseValue);
        res.json({ baseValue: portfolio.baseValue });
    }),
);

router.put(
    '/:number/leverage',
    ...validated({ params: numberParam, body: leverageBody }, async (req, res): Promise<void> => {
        const leverage = await portfolioService.setLeverage(authedUserId(req), req.params.number, req.body.leverage);
        res.json({ leverage });
    }),
);

router.put(
    '/:number/commission',
    ...validated({ params: numberParam, body: commissionBody }, async (req, res): Promise<void> => {
        const defaultCommission = await portfolioService.setDefaultCommission(
            authedUserId(req),
            req.params.number,
            req.body.commission,
        );
        res.json({ defaultCommission });
    }),
);

router.put(
    '/:number/benchmarks',
    ...validated({ params: numberParam, body: benchmarksBody }, async (req, res): Promise<void> => {
        const benchmarks = await portfolioService.setBenchmarks(authedUserId(req), req.params.number, req.body.symbols);
        res.json({ benchmarks });
    }),
);

router.get(
    '/:number/export',
    ...validated({ params: numberParam }, async (req, res): Promise<void> => {
        res.json(await portfolioService.exportPortfolio(authedUserId(req), req.params.number));
    }),
);

router.post(
    '/:number/import',
    ...validated({ params: numberParam, body: importBody }, async (req, res): Promise<void> => {
        const declared = req.body.portfolio ?? {};

        const imported = await portfolioService.replaceTrades(
            authedUserId(req),
            req.params.number,
            req.body.trades.map(toTradeInput),
            {
                ...(declared.baseValue !== undefined ? { baseValue: declared.baseValue } : {}),
                ...(declared.leverage !== undefined ? { leverage: declared.leverage } : {}),
                ...(declared.defaultCommission !== undefined ? { defaultCommission: declared.defaultCommission } : {}),
                ...(declared.benchmarks !== undefined ? { benchmarks: declared.benchmarks } : {}),
            },
            {
                ...(declared.stats !== undefined && declared.stats !== null ? { stats: declared.stats } : {}),
                ...(declared.valueHistory !== undefined ? { valueHistory: declared.valueHistory } : {}),
            },
        );

        res.json({ imported });
    }),
);
