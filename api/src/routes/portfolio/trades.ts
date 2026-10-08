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
import type { z } from 'zod';

import { portfolioParam, tradeBody, tradePageSchema, tradeParams, tradeRowSchema, tradesQuery } from '@ereuna/shared';

import { send } from '@/lib/send.js';
import { authedUserId } from '@/middleware/auth.js';
import { validated } from '@/middleware/validate.js';
import * as portfolioService from '@/services/portfolio/index.js';
import type { TradeFields } from '@/services/portfolio/index.js';

export const router = Router({ mergeParams: true });

/** Normalise a validated trade into the service's input shape: the log stores a cash movement with no instrument and zero shares. */
export function toTradeFields(trade: z.output<typeof tradeBody>): TradeFields {
    const movement = {
        total: trade.total,
        commission: trade.commission ?? null,
        tradeDate: new Date(trade.tradeDate),
    };
    if ('symbol' in trade) {
        return { action: trade.action, symbol: trade.symbol, shares: trade.shares, price: trade.price, ...movement };
    }
    return { action: trade.action, symbol: null, shares: 0, price: 0, ...movement };
}

router.get(
    '/',
    ...validated({ params: portfolioParam, query: tradesQuery }, async (req, res): Promise<void> => {
        const { page, limit, symbol } = req.validatedQuery;
        const trades = await portfolioService.getTradePage(authedUserId(req), req.params.number, {
            page,
            limit,
            ...(symbol !== undefined ? { symbol } : {}),
        });
        send(res, tradePageSchema, trades);
    }),
);

router.post(
    '/',
    ...validated({ params: portfolioParam, body: tradeBody }, async (req, res): Promise<void> => {
        const trade = await portfolioService.addTrade(authedUserId(req), req.params.number, toTradeFields(req.body));
        send(res.status(201), tradeRowSchema, trade);
    }),
);

router.patch(
    '/:id',
    ...validated({ params: tradeParams, body: tradeBody }, async (req, res): Promise<void> => {
        const trade = await portfolioService.updateTrade(
            authedUserId(req),
            req.params.number,
            new ObjectId(req.params.id),
            toTradeFields(req.body),
        );
        send(res, tradeRowSchema, trade);
    }),
);

router.delete(
    '/:id',
    ...validated({ params: tradeParams }, async (req, res): Promise<void> => {
        await portfolioService.deleteTrade(authedUserId(req), req.params.number, new ObjectId(req.params.id));
        res.status(204).end();
    }),
);
