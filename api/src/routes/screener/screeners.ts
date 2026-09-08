/**
 * Screener routes — mounted at /api/screeners (all require authentication)
 * GET    /api/screeners                          — list the user's screeners
 * POST   /api/screeners                          — create a screener
 * GET    /api/screeners/filters                  — the filter registry with bounds and options
 * GET    /api/screeners/results                  — combined results across included screeners
 * GET    /api/screeners/hidden/results           — the hidden symbols, as full result rows
 * GET    /api/screeners/:name                    — one screener with its filters
 * PATCH  /api/screeners/:name                    — rename, or include/exclude from combined results
 * DELETE /api/screeners/:name                    — delete a screener
 * GET    /api/screeners/:name/results            — results for one screener
 * PUT    /api/screeners/:name/filters/:filter    — set one filter
 * DELETE /api/screeners/:name/filters/:filter    — clear one filter
 * DELETE /api/screeners/:name/filters            — clear every filter
 */
import { Router } from 'express';
import { z } from 'zod';
import {
    DATE_FILTERS,
    ENUM_FILTERS,
    FLAG_FILTERS,
    MA_DIRECTIONS,
    MA_FILTERS,
    MA_TARGETS,
    RANGE_FILTERS,
    findDateFilter,
    findEnumFilter,
    findFlagFilter,
    findMaFilter,
    findRangeFilter,
} from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { makePaginationQuery, resourceNameSchema } from '@/lib/schemas.js';
import { authedUserId } from '@/middleware/auth.js';
import { validated } from '@/middleware/validate.js';
import * as screenerService from '@/services/screener/index.js';
import { getPreferences } from '@/services/user/index.js';

const nameParam = z.object({ name: resourceNameSchema });
const filterParams = z.object({ name: resourceNameSchema, filter: z.string().trim().min(1) });

const createBody = z.object({ name: resourceNameSchema });

const updateBody = z
    .object({ name: resourceNameSchema, include: z.boolean() })
    .partial()
    .refine((body) => Object.keys(body).length > 0, { message: 'name or include is required' });

/**
 * One body schema covering every filter kind, discriminated by which keys are
 * present. The service resolves the kind from the registry and reads only the
 * keys that kind uses, so a body carrying the wrong shape for its filter is
 * rejected there with the filter named.
 */
const filterBody = z.object({
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    values: z.array(z.string().trim().min(1).max(120)).max(500).optional(),
    from: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
    to: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
    direction: z.enum(MA_DIRECTIONS).optional(),
    target: z.enum(MA_TARGETS).optional(),
    enabled: z.boolean().optional(),
});

const resultsQuery = makePaginationQuery({ defaultLimit: 50, maxLimit: 200 });

export const router = Router();

function missingField(filter: string, field: string): AppError {
    return new AppError(422, 'FILTER_RANGE_INVALID', `filter ${filter} requires ${field}`, { params: { filter } });
}

router.get(
    '/',
    ...validated({}, async (req, res): Promise<void> => {
        res.json({ items: await screenerService.listScreeners(authedUserId(req)) });
    }),
);

router.post(
    '/',
    ...validated({ body: createBody }, async (req, res): Promise<void> => {
        res.status(201).json(await screenerService.createScreener(authedUserId(req), req.body.name));
    }),
);

/**
 * The filter catalogue: every filter the API accepts, with its bounds or
 * options resolved. The frontend builds its panels from this instead of
 * hardcoding a list that has to be kept in step with the backend by hand.
 */
router.get(
    '/filters',
    ...validated({}, async (_req, res): Promise<void> => {
        // Bounds resolve in parallel and individually: a filter whose column the
        // ingestor has not populated comes back `available: false` instead of
        // failing the request and blanking every other panel.
        const [ranges, enums, dates] = await Promise.all([
            Promise.all(
                RANGE_FILTERS.map(async (spec) => {
                    const bounds = await screenerService.tryGetBounds(() => screenerService.getRangeBounds(spec));
                    return {
                        key: spec.key,
                        label: spec.label,
                        kind: 'range' as const,
                        bounds,
                        available: bounds !== null,
                    };
                }),
            ),
            Promise.all(
                ENUM_FILTERS.map(async (spec) => {
                    const options = await screenerService.getEnumOptions(spec);
                    return {
                        key: spec.key,
                        label: spec.label,
                        kind: 'enum' as const,
                        options,
                        available: options.length > 0,
                    };
                }),
            ),
            Promise.all(
                DATE_FILTERS.map(async (spec) => {
                    const bounds = await screenerService.tryGetBounds(() => screenerService.getDateBounds(spec));
                    return {
                        key: spec.key,
                        label: spec.label,
                        kind: 'date' as const,
                        bounds,
                        available: bounds !== null,
                    };
                }),
            ),
        ]);

        res.json({
            items: [
                ...ranges,
                ...enums,
                ...dates,
                ...MA_FILTERS.map((spec) => ({
                    key: spec.key,
                    label: spec.label,
                    kind: 'ma' as const,
                    available: true,
                    directions: MA_DIRECTIONS,
                    targets: MA_TARGETS,
                })),
                ...FLAG_FILTERS.map((spec) => ({
                    key: spec.key,
                    label: spec.label,
                    kind: 'flag' as const,
                    available: true,
                })),
            ],
        });
    }),
);

router.get(
    '/results',
    ...validated({ query: resultsQuery }, async (req, res): Promise<void> => {
        const userId = authedUserId(req);
        const { page, limit } = req.validatedQuery;
        const prefs = await getPreferences(userId);

        res.json(
            await screenerService.runIncludedScreeners(userId, {
                page,
                limit,
                columns: prefs.screenerColumns,
                hiddenSymbols: prefs.hiddenSymbols,
            }),
        );
    }),
);

/** Registered before `/:name` so `hidden` is not read as a screener name. */
router.get(
    '/hidden/results',
    ...validated({ query: resultsQuery }, async (req, res): Promise<void> => {
        const userId = authedUserId(req);
        const { page, limit } = req.validatedQuery;
        const prefs = await getPreferences(userId);

        res.json(
            await screenerService.runHiddenSymbols(userId, {
                page,
                limit,
                columns: prefs.screenerColumns,
                hiddenSymbols: prefs.hiddenSymbols,
            }),
        );
    }),
);

router.get(
    '/:name',
    ...validated({ params: nameParam }, async (req, res): Promise<void> => {
        const screener = await screenerService.getScreener(authedUserId(req), req.params.name);
        res.json({ ...screenerService.toSummary(screener), filters: screener.filters });
    }),
);

router.patch(
    '/:name',
    ...validated({ params: nameParam, body: updateBody }, async (req, res): Promise<void> => {
        const userId = authedUserId(req);
        const { name } = req.params;

        let summary = await screenerService.getScreener(userId, name).then((doc) => screenerService.toSummary(doc));

        if (req.body.include !== undefined) {
            summary = await screenerService.setScreenerIncluded(userId, name, { include: req.body.include });
        }
        if (req.body.name !== undefined) {
            summary = await screenerService.renameScreener(userId, name, req.body.name);
        }

        res.json(summary);
    }),
);

router.delete(
    '/:name',
    ...validated({ params: nameParam }, async (req, res): Promise<void> => {
        await screenerService.deleteScreener(authedUserId(req), req.params.name);
        res.status(204).end();
    }),
);

router.get(
    '/:name/results',
    ...validated({ params: nameParam, query: resultsQuery }, async (req, res): Promise<void> => {
        const userId = authedUserId(req);
        const { page, limit } = req.validatedQuery;
        const prefs = await getPreferences(userId);

        res.json(
            await screenerService.runScreener(userId, req.params.name, {
                page,
                limit,
                columns: prefs.screenerColumns,
                hiddenSymbols: prefs.hiddenSymbols,
            }),
        );
    }),
);

/**
 * Set one filter. Which body keys are read depends on the filter's kind:
 *   range → min and/or max      enum → values
 *   ma    → direction + target  flag → enabled
 */
router.put(
    '/:name/filters/:filter',
    ...validated({ params: filterParams, body: filterBody }, async (req, res): Promise<void> => {
        const userId = authedUserId(req);
        const { name, filter } = req.params;
        const body = req.body;

        if (findRangeFilter(filter) !== null) {
            const screener = await screenerService.setRangeFilter(userId, name, filter, {
                min: body.min,
                max: body.max,
            });
            res.json({ filters: screener.filters });
            return;
        }

        if (findEnumFilter(filter) !== null) {
            if (body.values === undefined) throw missingField(filter, 'values');
            const screener = await screenerService.setEnumFilter(userId, name, filter, body.values);
            res.json({ filters: screener.filters });
            return;
        }

        if (findDateFilter(filter) !== null) {
            const screener = await screenerService.setDateFilter(userId, name, filter, {
                from: body.from,
                to: body.to,
            });
            res.json({ filters: screener.filters });
            return;
        }

        if (findMaFilter(filter) !== null) {
            if (body.direction === undefined || body.target === undefined) {
                throw missingField(filter, 'direction and target');
            }
            const screener = await screenerService.setMaFilter(userId, name, filter, body.direction, body.target);
            res.json({ filters: screener.filters });
            return;
        }

        if (findFlagFilter(filter) !== null) {
            if (body.enabled === undefined) throw missingField(filter, 'enabled');
            const screener = await screenerService.setFlagFilter(userId, name, filter, { enabled: body.enabled });
            res.json({ filters: screener.filters });
            return;
        }

        throw new AppError(422, 'UNKNOWN_SCREENER_FILTER', `no screener filter named ${filter}`, {
            params: { filter },
        });
    }),
);

router.delete(
    '/:name/filters/:filter',
    ...validated({ params: filterParams }, async (req, res): Promise<void> => {
        const screener = await screenerService.clearFilter(authedUserId(req), req.params.name, req.params.filter);
        res.json({ filters: screener.filters });
    }),
);

router.delete(
    '/:name/filters',
    ...validated({ params: nameParam }, async (req, res): Promise<void> => {
        const screener = await screenerService.resetFilters(authedUserId(req), req.params.name);
        res.json({ filters: screener.filters });
    }),
);
