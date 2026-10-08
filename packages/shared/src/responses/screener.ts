/**
 * Response schemas for /api/screeners (see responses/identity.ts for how
 * `send()` uses them), beside the filter registry in `screener/filters.ts`.
 * Timestamps are ISO 8601 strings.
 */
import { z } from 'zod';

import { ENUM_FILTERS, MA_DIRECTIONS, MA_FILTERS, MA_TARGETS, RANGE_FILTERS } from '#screener/filters.js';

/** One row of GET /screeners, and POST /screeners (201) and PATCH /screeners/:name. */
export const screenerSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    include: z.boolean(), // Whether it contributes to the combined results
    filterCount: z.number().int().nonnegative(),
    updatedAt: z.string(),
});

/** GET /screeners */
export const screenerListSchema = z.object({ items: z.array(screenerSummarySchema) });

/**
 * The filters written on a screener, keyed by the field each is stored under:
 * a range is `[min, max]`, a date range or an enum selection a list of strings,
 * a moving-average relation one string, a flag `true`. Which one applies is the
 * catalogue's `kind`, never a guess from the value. The range is two numbers
 * rather than a tuple: both positions are numbers either way, and the fuzzer
 * rewrites a 3.1 tuple into a form it then refuses as an invalid schema.
 */
const screenerFiltersSchema = z.record(
    z.string(),
    z.union([z.array(z.number()).length(2), z.array(z.string()), z.string(), z.boolean()]),
);

/** GET /screeners/:name */
export const screenerDetailSchema = screenerSummarySchema.extend({ filters: screenerFiltersSchema });

/** PUT and DELETE /screeners/:name/filters/:filter, and DELETE /screeners/:name/filters — the filters after the change. */
export const screenerFilterSetSchema = z.object({ filters: screenerFiltersSchema });

const descriptorBaseSchema = z.object({ key: z.string(), label: z.string(), available: z.boolean() });

/**
 * One filter the API accepts, with its bounds or options resolved. `available:
 * false` means the ingestor has not populated that column yet — the filter is
 * real, but there is nothing to range over, so it renders disabled.
 */
const filterDescriptorSchema = z.discriminatedUnion('kind', [
    descriptorBaseSchema.extend({
        kind: z.literal('range'),
        bounds: z.object({ min: z.number(), max: z.number() }).nullable(),
    }),
    descriptorBaseSchema.extend({
        kind: z.literal('date'),
        bounds: z.object({ min: z.string(), max: z.string() }).nullable(),
    }),
    descriptorBaseSchema.extend({ kind: z.literal('enum'), options: z.array(z.string()) }),
    descriptorBaseSchema.extend({
        kind: z.literal('ma'),
        directions: z.array(z.enum(MA_DIRECTIONS)),
        targets: z.array(z.enum(MA_TARGETS)),
    }),
    descriptorBaseSchema.extend({ kind: z.literal('flag') }),
]);

/** GET /screeners/filters */
export const filterCatalogueSchema = z.object({ items: z.array(filterDescriptorSchema) });

export type ScreenerSummary = z.infer<typeof screenerSummarySchema>;
export type ScreenerFilters = z.infer<typeof screenerFiltersSchema>;
export type ScreenerDetail = z.infer<typeof screenerDetailSchema>;
export type FilterDescriptor = z.infer<typeof filterDescriptorSchema>;
export type ScreenerColumn = (typeof SCREENER_COLUMNS)[number];
export type ScreenerResult = z.infer<typeof screenerResultSchema>;
export type ScreenerResultPage = z.infer<typeof screenerResultPageSchema>;

/**
 * Every AssetInfo path a result table may show: the API projects only these,
 * and a result row carries its columns keyed by them. A filter is a column
 * because a value worth narrowing by is a value worth reading beside the symbol.
 */
export const SCREENER_COLUMNS = [
    ...RANGE_FILTERS.map((f) => f.queryPath),
    ...ENUM_FILTERS.map((f) => f.queryPath),
    ...MA_FILTERS.map((f) => f.path),
];

/** One matching asset, with the user's chosen columns keyed by their AssetInfo path. */
const screenerResultSchema = z.object({
    symbol: z.string(),
    name: z.string().nullable(),
    assetType: z.string().nullable(),
    sector: z.string().nullable(),
    exchange: z.string().nullable(),
    screeners: z.array(z.string()).exactOptional(), // Combined results only: the included screeners this symbol matched
    columns: z.partialRecord(z.enum(SCREENER_COLUMNS), z.union([z.number(), z.string()]).nullable()),
});

/** GET /screeners/results, /screeners/hidden/results and /screeners/:name/results */
export const screenerResultPageSchema = z.object({
    items: z.array(screenerResultSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pages: z.number().int().nonnegative(),
});
