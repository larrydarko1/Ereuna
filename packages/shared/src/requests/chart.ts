/**
 * Request schemas for /api/charts. See requests/identity.ts for how the API and
 * the frontend share them.
 */
import { z } from 'zod';

import { CHART_TIMEFRAMES, DRAWING_KINDS } from '#db/collections.js';
import { LIMITS } from '#limits.js';
import { isoDateField, queryDigits, searchField } from '#requests/fields.js';
import { chartDrawingsSchema } from '#responses/chart.js';

/** GET, PUT and DELETE /charts/:symbol/drawings: the timeframe the drawings belong to. */
export const timeframeQuery = z.object({
    timeframe: z.enum(CHART_TIMEFRAMES).default('daily'),
});

/**
 * GET /charts/:symbol/events — the latest few markers, or `all=true` for the
 * whole history. Spelled as two words rather than `z.stringbool()`, which also
 * takes `yes`, `on`, `1` and their opposites and documents as any string.
 */
export const eventsQuery = z.object({
    all: z
        .enum(['true', 'false'])
        .default('false')
        .transform((value) => value === 'true'),
});

/** GET /charts/search */
export const searchQuery = z.object({
    q: searchField(60),
    limit: queryDigits('limit must be 1–50')
        .pipe(z.number().int().min(1, 'limit must be 1–50').max(50, 'limit must be 1–50'))
        .default(20),
});

/** GET /charts/:symbol — `before` pages back through history from that bar. */
export const seriesQuery = timeframeQuery.extend({
    before: isoDateField.optional(),
});

/** PUT /charts/:symbol/drawings — the same shapes a load answers with, so a drawing saved is one a tool can load back. */
export const drawingsBody = chartDrawingsSchema.refine(
    (drawings) => DRAWING_KINDS.every((kind) => drawings[kind].length <= LIMITS.drawingsPerKind),
    { message: `At most ${LIMITS.drawingsPerKind} drawings of each kind` },
);
