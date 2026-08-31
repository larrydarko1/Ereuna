/**
 * screener-bounds — the selectable range and option set behind each filter.
 * Owns: deriving a filter's min/max from AssetInfo, and enumerating a
 * categorical filter's options.
 * Does NOT own: applying a filter (screener-filters.ts) or querying results
 * (screener-query.ts).
 */
import type { AssetInfoDoc, DateFilterSpec, EnumFilterSpec, RangeFilterSpec } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { marketKey, withCache } from '@/lib/cache.js';
import { getDb } from '@/lib/db.js';

export type FilterBounds = { min: number; max: number };
export type DateBounds = { min: string; max: string };

/**
 * The full selectable range for a filter.
 * `latestClose` is its own case because price is not a scalar column on
 * AssetInfo — it lives in the OHLCV series, so the ceiling is the highest
 * recent close rather than an aggregate over a field.
 */
export async function getRangeBounds(spec: RangeFilterSpec): Promise<FilterBounds> {
    if (spec.bounds.kind === 'fixed') {
        return { min: spec.bounds.min, max: spec.bounds.max };
    }

    if (spec.bounds.kind === 'latestClose') {
        return withCache(marketKey('bounds', spec.key), fetchPriceBounds, { dataType: 'static' });
    }

    return withCache(marketKey('bounds', spec.key), () => fetchFieldBounds(spec.queryPath), { dataType: 'static' });
}

/** The option set for a categorical filter, sorted for stable display. */
export async function getEnumOptions(spec: EnumFilterSpec): Promise<string[]> {
    if (spec.options.kind === 'literal') return [...spec.options.values];

    const path = spec.options.path;
    return withCache(
        marketKey('options', spec.key),
        async () => {
            const values = await getDb()
                .collection<AssetInfoDoc>('AssetInfo')
                .distinct(path, { [path]: { $nin: [null, '', 'None'] } });
            return values.filter((v): v is string => typeof v === 'string').sort((a, b) => a.localeCompare(b));
        },
        { dataType: 'static' },
    );
}

/**
 * `$min`/`$max` over one AssetInfo path.
 * The `$match` restricts to documents where the path actually holds a number:
 * the ingestor writes the string `'None'` for missing data, and a single one of
 * those would otherwise be compared as a string and skew the result.
 */
async function fetchFieldBounds(path: string): Promise<FilterBounds> {
    const [result] = await getDb()
        .collection<AssetInfoDoc>('AssetInfo')
        .aggregate<{ min: number | null; max: number | null }>([
            { $match: { [path]: { $type: 'number' } } },
            { $group: { _id: null, min: { $min: boundsExpr(path) }, max: { $max: boundsExpr(path) } } },
        ])
        .toArray();

    if (result === undefined || result.min === null || result.max === null) {
        throw new AppError(422, 'FILTER_BOUND_UNAVAILABLE', `no numeric values at AssetInfo.${path}`);
    }
    return { min: roundDown(result.min), max: roundUp(result.max) };
}

/**
 * The aggregation expression that reads `path`.
 * A dotted array index like `quarterlyFinancials.0.roe` is valid in a query but
 * NOT in an aggregation expression, where `$quarterlyFinancials.0.roe` resolves
 * to nothing and silently yields bounds of 0–0. Inside an expression the array
 * has to be indexed explicitly: `$quarterlyFinancials.roe` maps the field
 * across the array, and `$arrayElemAt` takes the element wanted.
 */
function boundsExpr(path: string): unknown {
    const match = /^(?<array>[^.]+)\.(?<index>\d+)\.(?<field>.+)$/.exec(path);
    if (match?.groups === undefined) return `$${path}`;

    const { array, index, field } = match.groups;
    return { $arrayElemAt: [`$${array}.${field}`, Number(index)] };
}

async function fetchPriceBounds(): Promise<FilterBounds> {
    const [result] = await getDb()
        .collection('AssetInfo')
        .aggregate<{ max: number | null }>([
            { $match: { 'TimeSeries.close': { $type: 'number' } } },
            { $group: { _id: null, max: { $max: '$TimeSeries.close' } } },
        ])
        .toArray();

    if (result === undefined || result.max === null) {
        throw new AppError(422, 'FILTER_BOUND_UNAVAILABLE', 'no price data available to bound the price filter');
    }
    // A floor of zero rather than the cheapest listed price: sub-penny stocks
    // otherwise make the lower bound meaningless on the slider.
    return { min: 0, max: roundUp(result.max) };
}

const roundDown = (n: number): number => Math.floor(n * 100) / 100;
const roundUp = (n: number): number => Math.ceil(n * 100) / 100;

/** The full selectable span for a date filter, as ISO-8601 strings. */
export async function getDateBounds(spec: DateFilterSpec): Promise<DateBounds> {
    return withCache(
        marketKey('bounds', spec.key),
        async () => {
            const [result] = await getDb()
                .collection<AssetInfoDoc>('AssetInfo')
                .aggregate<{ min: Date | null; max: Date | null }>([
                    { $match: { [spec.queryPath]: { $type: 'date' } } },
                    { $group: { _id: null, min: { $min: `$${spec.queryPath}` }, max: { $max: `$${spec.queryPath}` } } },
                ])
                .toArray();

            if (result === undefined || result.min === null || result.max === null) {
                throw new AppError(422, 'FILTER_BOUND_UNAVAILABLE', `no dates at AssetInfo.${spec.queryPath}`);
            }
            return { min: result.min.toISOString(), max: result.max.toISOString() };
        },
        { dataType: 'static' },
    );
}

/**
 * Resolve bounds without throwing, for the filter catalogue.
 * A filter whose column the ingestor has not populated yet is reported as
 * unavailable rather than failing the whole request — one absent metric must
 * not blank out every other filter panel in the UI.
 */
export async function tryGetBounds<T>(resolve: () => Promise<T>): Promise<T | null> {
    try {
        return await resolve();
    } catch (err) {
        if (err instanceof AppError && err.code === 'FILTER_BOUND_UNAVAILABLE') return null;
        throw err;
    }
}
