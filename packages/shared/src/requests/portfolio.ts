/**
 * Request schemas for /api/portfolios and its trades. See requests/identity.ts
 * for how the API and the frontend share them.
 */
import { z } from 'zod';

import { CASH_ACTIONS, POSITION_ACTIONS } from '#db/collections.js';
import { LIMITS } from '#limits.js';
import { isoDateField, makePaginationQuery, symbolField } from '#requests/fields.js';
import { portfolioStatsSchema, valuePointSchema } from '#responses/portfolio.js';

const baseValueField = z.number().nonnegative().max(1e12);
const leverageField = z.number().min(1).max(LIMITS.maxLeverage);
const commissionField = z.number().nonnegative().max(LIMITS.maxCommission);
const benchmarksField = z.array(symbolField).max(LIMITS.benchmarksPerPortfolio);

/** What a trade and a cash movement both carry. */
const movementBody = z.object({
    total: z.number().positive().max(1e12),
    commission: commissionField.optional(),
    tradeDate: isoDateField,
});

/**
 * POST /portfolios/:number/trades and PATCH …/trades/:id, and each row of an
 * import. Two shapes, told apart by `action`: a trade names its instrument, its
 * share count and its price, and a cash movement names none of them.
 */
export const tradeBody = z.discriminatedUnion('action', [
    movementBody.extend({
        action: z.enum(POSITION_ACTIONS),
        symbol: symbolField,
        shares: z.number().positive().max(1e9),
        price: z.number().positive().max(1e9),
    }),
    movementBody.extend({ action: z.enum(CASH_ACTIONS) }),
]);

/** PUT /portfolios/:number/base-value */
export const baseValueBody = z.object({ baseValue: baseValueField });

/** PUT /portfolios/:number/leverage */
export const leverageBody = z.object({ leverage: leverageField });

/** PUT /portfolios/:number/commission */
export const commissionBody = z.object({ commission: commissionField });

/** PUT /portfolios/:number/benchmarks */
export const benchmarksBody = z.object({ symbols: benchmarksField });

/**
 * POST /portfolios/:number/import — the file an export wrote. A declared
 * snapshot is checked against the schemas the export answers with, so a file a
 * user downloaded is always one they can upload.
 */
export const importBody = z.object({
    trades: z.array(tradeBody).max(LIMITS.importRows),
    portfolio: z
        .object({
            baseValue: baseValueField.optional(),
            leverage: leverageField.optional(),
            defaultCommission: commissionField.optional(),
            benchmarks: benchmarksField.optional(),
            stats: portfolioStatsSchema.nullish(),
            valueHistory: z.array(valuePointSchema).max(LIMITS.importRows).optional(),
        })
        .optional(),
});

/** GET /portfolios/:number/trades — `symbol` narrows the blotter to one ticker. */
export const tradesQuery = makePaginationQuery({ defaultLimit: 50, maxLimit: 200 }).extend({
    symbol: symbolField.optional(),
});
