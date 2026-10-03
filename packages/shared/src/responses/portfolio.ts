/**
 * Response schemas for /api/portfolios and its trades (see responses/identity.ts
 * for how `send()` uses them). The trade log is the only thing stored; every
 * figure below is replayed from it server-side, which is why nothing here is
 * meant to be computed in the browser. Dates are ISO 8601 strings.
 */
import { z } from 'zod';

const tradeActionSchema = z.enum(['buy', 'sell', 'short', 'cover', 'deposit', 'withdrawal']);

/**
 * One trade as the client writes it, and as an export hands it back.
 * `shares` and `price` are omitted on a cash movement rather than zeroed: a
 * deposit that names a share count is a malformed deposit, and an export has to
 * round-trip through the import that rejects one.
 */
const tradeInputSchema = z.object({
    action: tradeActionSchema,
    symbol: z.string().nullable().exactOptional(), // Null for `deposit` and `withdrawal`, which move cash and name no instrument
    shares: z.number().exactOptional(),
    price: z.number().exactOptional(),
    total: z.number(),
    commission: z.number().exactOptional(), // Omitted to take the portfolio's default
    tradeDate: z.string(),
});

/** POST /portfolios/:number/trades (201) and PATCH …/trades/:id, and one row of the list. */
export const tradeRowSchema = z.object({
    id: z.string(),
    symbol: z.string().nullable(),
    action: tradeActionSchema,
    shares: z.number(),
    price: z.number(),
    total: z.number(),
    commission: z.number(),
    tradeDate: z.string(),
    createdAt: z.string(),
});

/** GET /portfolios/:number/trades */
export const tradePageSchema = z.object({
    items: z.array(tradeRowSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
});

const valuedPositionSchema = z.object({
    symbol: z.string(),
    side: z.enum(['long', 'short']),
    shares: z.number(),
    avgPrice: z.number(),
    lastClose: z.number().nullable(), // Null when the ingestor has no bar for the symbol yet
    marketValue: z.number().nullable(), // Absolute value — a short's is what buying it back would cost
    exposure: z.number().nullable(), // Signed contribution to equity: negative for a short
    unrealizedPL: z.number().nullable(),
    unrealizedPLPercent: z.number().nullable(),
    weight: z.number().nullable(), // Share of gross exposure, in percent
});

const benchmarkResultSchema = z.object({
    symbol: z.string(),
    inceptionPrice: z.number(),
    currentPrice: z.number(),
    returnPercent: z.number(),
    portfolioReturnPercent: z.number(),
    outperformance: z.number(),
});

const tradeExtremeSchema = z.object({
    ticker: z.string(),
    amount: z.number(),
    tradeCount: z.number().int().nonnegative(),
});

/**
 * The closed-trade statistics, as replayed or as an import declared them. The
 * import body validates a declared snapshot against this same schema, so a file
 * a user exported is always one they can upload.
 */
export const portfolioStatsSchema = z.object({
    realizedPL: z.number(),
    realizedPLPercent: z.number(),
    winnerCount: z.number().int().nonnegative(),
    loserCount: z.number().int().nonnegative(),
    breakevenCount: z.number().int().nonnegative(),
    winnerPercent: z.number(),
    loserPercent: z.number(),
    breakevenPercent: z.number(),
    avgGain: z.number(),
    avgLoss: z.number(),
    avgGainAbs: z.number(),
    avgLossAbs: z.number(),
    avgPositionSize: z.number(),
    avgHoldTimeWinners: z.number(),
    avgHoldTimeLosers: z.number(),
    gainLossRatio: z.number().nullable(),
    profitFactor: z.number().nullable(),
    riskRewardRatio: z.number().nullable(),
    sortinoRatio: z.number().nullable(),
    totalCommission: z.number(),
    longCount: z.number().int().nonnegative(),
    shortCount: z.number().int().nonnegative(),
    biggestWinner: tradeExtremeSchema.nullable(),
    biggestLoser: tradeExtremeSchema.nullable(),
    tradeReturnsChart: z.object({
        bins: z.array(
            z.object({
                min: z.number(),
                max: z.number(),
                range: z.string(),
                count: z.number().int().nonnegative(),
                positive: z.boolean(),
            }),
        ),
        medianBinIndex: z.number().int().min(-1), // -1 when there are no closed trades
    }),
});

/** One day of equity, as replayed or as an import declared it. */
export const valuePointSchema = z.object({ date: z.iso.date(), value: z.number() });

/** One row of GET /portfolios — every slot the user has written to. */
const portfolioRowSchema = z.object({
    number: z.number().int().nonnegative(),
    cash: z.number(),
    baseValue: z.number(),
    leverage: z.number(),
    defaultCommission: z.number(),
    benchmarks: z.array(z.string()),
    positionCount: z.number().int().nonnegative(),
    updatedAt: z.string(),
});

/** GET /portfolios */
export const portfolioListSchema = z.object({ items: z.array(portfolioRowSchema) });

/** GET /portfolios/:number */
export const portfolioSummarySchema = z.object({
    number: z.number().int().nonnegative(),
    cash: z.number(), // Negative means the portfolio carries a margin loan
    baseValue: z.number(),
    leverage: z.number(),
    defaultCommission: z.number(),
    positions: z.array(valuedPositionSchema),
    longValue: z.number(),
    shortValue: z.number(),
    grossExposure: z.number(), // Longs plus shorts — what the leverage limit is measured against
    netExposure: z.number(), // Longs minus shorts — what market direction is measured against
    totalValue: z.number(), // Equity: cash plus net exposure
    leverageUsed: z.number().nullable(),
    buyingPower: z.number(), // What is left before the leverage limit binds
    unrealizedPL: z.number(),
    totalPL: z.number().nullable(),
    totalPLPercent: z.number().nullable(),
    stats: portfolioStatsSchema.nullable(),
    valueHistory: z.array(valuePointSchema),
    benchmarks: z.array(benchmarkResultSchema),
});

/** PUT /portfolios/:number/base-value */
export const baseValueSchema = portfolioRowSchema.pick({ baseValue: true });

/** PUT /portfolios/:number/leverage */
export const leverageSchema = portfolioRowSchema.pick({ leverage: true });

/** PUT /portfolios/:number/commission */
export const defaultCommissionSchema = portfolioRowSchema.pick({ defaultCommission: true });

/** PUT /portfolios/:number/benchmarks */
export const benchmarksSchema = portfolioRowSchema.pick({ benchmarks: true });

/** GET /portfolios/:number/export — also exactly what the import accepts: the file a user downloads is a file they can upload. */
export const portfolioExportSchema = z.object({
    portfolio: z.object({
        baseValue: z.number(),
        leverage: z.number(),
        defaultCommission: z.number(),
        benchmarks: z.array(z.string()),
        stats: portfolioStatsSchema.nullable(),
        valueHistory: z.array(valuePointSchema),
    }),
    trades: z.array(tradeInputSchema),
});

/** POST /portfolios/:number/import — how many trades the log now holds. */
export const importResultSchema = z.object({ imported: z.number().int().nonnegative() });

export type TradeInput = z.infer<typeof tradeInputSchema>;
export type TradeRow = z.infer<typeof tradeRowSchema>;
export type TradePage = z.infer<typeof tradePageSchema>;
export type ValuedPosition = z.infer<typeof valuedPositionSchema>;
export type BenchmarkResult = z.infer<typeof benchmarkResultSchema>;
export type PortfolioRow = z.infer<typeof portfolioRowSchema>;
export type PortfolioSummary = z.infer<typeof portfolioSummarySchema>;
export type PortfolioExport = z.infer<typeof portfolioExportSchema>;
