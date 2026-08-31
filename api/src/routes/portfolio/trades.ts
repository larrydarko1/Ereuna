/**
 * Trade routes — mounted at /api/portfolios/:number/trades (authentication required)
 * GET    /api/portfolios/:number/trades           — the blotter, newest first
 * POST   /api/portfolios/:number/trades           — record a trade or a cash movement
 * PATCH  /api/portfolios/:number/trades/:id       — correct a trade, then replay
 * DELETE /api/portfolios/:number/trades/:id       — remove a trade, then replay
 * Mounted with `mergeParams` so `:number` from the parent router is visible here.
 */
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { config } from '@/lib/config.js';
import { idParam, makePaginationQuery, portfolioNumberSchema, symbolSchema } from '@/lib/schemas.js';
import { authedUserId } from '@/middleware/auth.js';
import { validated } from '@/middleware/validate.js';
import * as portfolioService from '@/services/portfolio/index.js';
import type { TradeInput } from '@/services/portfolio/index.js';

export const tradeInputSchema = z
    .object({
        action: z.enum(['buy', 'sell', 'short', 'cover', 'deposit', 'withdrawal']),
        symbol: symbolSchema.nullish(),
        shares: z.number().finite().positive().max(1e9).optional(),
        price: z.number().finite().positive().max(1e9).optional(),
        total: z.number().finite().positive().max(1e12),
        commission: z.number().finite().nonnegative().max(config.limits.maxCommission).optional(),
        tradeDate: z.iso.datetime({ offset: true }).or(z.iso.date()),
    })
    .superRefine((body, ctx) => {
        const isCash = body.action === 'deposit' || body.action === 'withdrawal';
        const add = (path: string, message: string): void => ctx.addIssue({ code: 'custom', path: [path], message });

        if (isCash) {
            if (body.symbol !== undefined && body.symbol !== null) add('symbol', 'Cash movements have no symbol');
            if (body.shares !== undefined) add('shares', 'Cash movements have no share count');
            if (body.price !== undefined) add('price', 'Cash movements have no price');
            return;
        }

        if (body.symbol === undefined || body.symbol === null) add('symbol', 'Symbol is required');
        if (body.shares === undefined) add('shares', 'Shares is required');
        if (body.price === undefined) add('price', 'Price is required');
    });

const tradeParams = z.object({ number: portfolioNumberSchema, id: idParam.shape.id });
const numberParam = z.object({ number: portfolioNumberSchema });

const listQuery = makePaginationQuery({ defaultLimit: 50, maxLimit: 200 }).extend({
    symbol: symbolSchema.optional(),
});

/** Normalise a validated body into the service's input shape. */
export function toTradeInput(body: z.output<typeof tradeInputSchema>): TradeInput {
    return {
        action: body.action,
        symbol: body.symbol ?? null,
        shares: body.shares ?? 0,
        price: body.price ?? 0,
        total: body.total,
        commission: body.commission ?? null,
        tradeDate: new Date(body.tradeDate),
    };
}

export const router = Router({ mergeParams: true });

router.get(
    '/',
    ...validated({ params: numberParam, query: listQuery }, async (req, res): Promise<void> => {
        const { page, limit, symbol } = req.validatedQuery;
        res.json(await portfolioService.listTrades(authedUserId(req), req.params.number, { page, limit, symbol }));
    }),
);

router.post(
    '/',
    ...validated({ params: numberParam, body: tradeInputSchema }, async (req, res): Promise<void> => {
        const trade = await portfolioService.addTrade(authedUserId(req), req.params.number, toTradeInput(req.body));
        res.status(201).json(trade);
    }),
);

router.patch(
    '/:id',
    ...validated({ params: tradeParams, body: tradeInputSchema }, async (req, res): Promise<void> => {
        const trade = await portfolioService.updateTrade(
            authedUserId(req),
            req.params.number,
            new ObjectId(req.params.id),
            toTradeInput(req.body),
        );
        res.json(trade);
    }),
);

router.delete(
    '/:id',
    ...validated({ params: tradeParams }, async (req, res): Promise<void> => {
        await portfolioService.deleteTrade(authedUserId(req), req.params.number, new ObjectId(req.params.id));
        res.json({ ok: true });
    }),
);
