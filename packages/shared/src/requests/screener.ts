/**
 * Request schemas for /api/screeners. See requests/identity.ts for how the API
 * and the frontend share them.
 */
import { z } from 'zod';

import { isoDateField, makePaginationQuery, resourceNameField } from '#requests/fields.js';
import { MA_DIRECTIONS, MA_TARGETS } from '#screener/filters.js';

/** POST /screeners */
export const createScreenerBody = z.object({ name: resourceNameField });

/** PATCH /screeners/:name — a new name, a place in the combined results, or both. */
export const updateScreenerBody = z
    .object({ name: resourceNameField, include: z.boolean() })
    .partial()
    .refine((body) => Object.keys(body).length > 0, { message: 'name or include is required' });

/**
 * PUT /screeners/:name/filters/:filter — one body for every filter kind,
 * discriminated by which keys are present. The route resolves the kind from the
 * registry and reads only the keys that kind uses, so a body carrying the wrong
 * shape for its filter is refused there with the filter named:
 *   range → min and/or max      enum → values      date → from and/or to
 *   ma    → direction + target  flag → enabled
 */
export const filterBody = z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    values: z.array(z.string().trim().min(1).max(120)).max(500).optional(),
    from: isoDateField.optional(),
    to: isoDateField.optional(),
    direction: z.enum(MA_DIRECTIONS).optional(),
    target: z.enum(MA_TARGETS).optional(),
    enabled: z.boolean().optional(),
});

/** GET /screeners/results, /screeners/hidden/results and /screeners/:name/results */
export const screenerResultsQuery = makePaginationQuery({ defaultLimit: 50, maxLimit: 200 });
