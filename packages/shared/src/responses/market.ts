/**
 * Response schemas for /api/market — the market overview and the exchange
 * holiday calendar (see responses/identity.ts for how `send()` uses them).
 * Both are built from a Stats document, never sent as one: the stored document
 * carries its own `_id` and whatever else the worker writes beside the figures.
 */
import { z } from 'zod';

import { BREADTH_UNIVERSES, OUTLOOK_TERMS } from '#market/overview.js';

const indexPerformanceSchema = z.object({
    symbol: z.string(),
    lastPrice: z.number().nullable(),
    oneDay: z.number().nullable(),
    oneMonth: z.number().nullable(),
    fourMonth: z.number().nullable(),
    oneYear: z.number().nullable(),
    yearToDate: z.number().nullable(),
});

/** How much of a universe sits above its moving average, as a fraction of 1. */
const movingAverageBreadthSchema = z.object({
    period: z.number(),
    above: z.number(),
    below: z.number(),
});

const outlookReadingSchema = z.object({
    term: z.enum(OUTLOOK_TERMS),
    verdict: z.enum(['bullish', 'neutral', 'bearish']),
    percentUp: z.number(),
    periods: z.array(z.number()),
});

/** Fractions of the measured universe; advancing/declining/unchanged add to 1, as do the three below them. */
const breadthSplitSchema = z.object({
    advancing: z.number(),
    declining: z.number(),
    unchanged: z.number(),
    newHighs: z.number(),
    newLows: z.number(),
    neutral: z.number(),
});

const tierRowSchema = z.object({
    name: z.string(),
    averageReturn: z.number(),
    count: z.number(),
});

const moverRowSchema = z.object({
    symbol: z.string(),
    dailyReturn: z.number(),
});

/** GET /market/stats */
export const marketOverviewSchema = z.object({
    updatedAt: z.string().nullable(),
    indexes: z.array(indexPerformanceSchema),
    outlook: z.array(outlookReadingSchema),
    breadth: breadthSplitSchema,
    movingAverages: z.record(z.enum(BREADTH_UNIVERSES), z.array(movingAverageBreadthSchema)),
    sectors: z.array(tierRowSchema),
    industries: z.array(tierRowSchema),
    gainers: z.array(moverRowSchema),
    losers: z.array(moverRowSchema),
});

const marketHolidaySchema = z.object({
    date: z.string(), // YYYY-MM-DD
    name: z.string(),
});

/** GET /market/holidays */
export const holidayCalendarSchema = z.object({ holidays: z.array(marketHolidaySchema) });

export type IndexPerformance = z.infer<typeof indexPerformanceSchema>;
export type MovingAverageBreadth = z.infer<typeof movingAverageBreadthSchema>;
export type OutlookReading = z.infer<typeof outlookReadingSchema>;
export type OutlookVerdict = OutlookReading['verdict'];
export type BreadthSplit = z.infer<typeof breadthSplitSchema>;
export type TierRow = z.infer<typeof tierRowSchema>;
export type MoverRow = z.infer<typeof moverRowSchema>;
export type MarketOverview = z.infer<typeof marketOverviewSchema>;
export type MarketHoliday = z.infer<typeof marketHolidaySchema>;
