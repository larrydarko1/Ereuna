/**
 * screener-query — turning stored filters into a MongoDB query, and running it.
 * Owns: query construction and result retrieval.
 * Does NOT own: filter storage (screener-filters.ts) or bounds (screener-bounds.ts).
 */
import type { Document, Filter } from 'mongodb';
import { ObjectId } from 'mongodb';
import {
    DATE_FILTERS,
    ENUM_FILTERS,
    FLAG_FILTERS,
    MA_FILTERS,
    RANGE_FILTERS,
    type AssetInfoDoc,
    type ScreenerDoc,
    type ScreenerFilterValue,
} from '@ereuna/shared';
import { userKey, withCache } from '@/lib/cache.js';
import { getDb } from '@/lib/db.js';
import { getScreener } from '@/services/screener/screener-crud.js';

export type ScreenerResultPage = {
    items: ScreenerResult[];
    total: number;
    page: number;
    pages: number;
};

type ScreenerResult = {
    symbol: string;
    name: string | null;
    assetType: string | null;
    sector: string | null;
    exchange: string | null;
    [column: string]: unknown;
};

/** Columns every result carries, on top of whatever the user has selected. */
const BASE_PROJECTION = {
    _id: 0,
    Symbol: 1,
    Name: 1,
    AssetType: 1,
    Sector: 1,
    Exchange: 1,
} as const;

export function buildQuery(
    filters: Record<string, ScreenerFilterValue>,
    hiddenSymbols: string[] = [],
): Filter<AssetInfoDoc> {
    const query: Filter<AssetInfoDoc> = {};
    const expressions: Document[] = [];

    for (const spec of RANGE_FILTERS) {
        const value = filters[spec.field];
        if (!isRange(value)) continue;
        const [min, max] = value;

        // Price lives inside the embedded time series, so it is compared as an
        // expression rather than as a field range.
        if (spec.bounds.kind === 'latestClose') {
            expressions.push({ $and: [{ $gt: [`$${spec.queryPath}`, min] }, { $lt: [`$${spec.queryPath}`, max] }] });
            continue;
        }

        query[spec.queryPath] = { $gt: min, $lt: max };
    }

    for (const spec of ENUM_FILTERS) {
        const value = filters[spec.field];
        if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string')) {
            query[spec.queryPath] = { $in: value };
        }
    }

    for (const spec of DATE_FILTERS) {
        const value = filters[spec.field];
        if (!isDateRange(value)) continue;
        query[spec.queryPath] = { $gte: new Date(value[0]), $lte: new Date(value[1]) };
    }

    for (const spec of MA_FILTERS) {
        const value = filters[spec.field];
        if (typeof value !== 'string') continue;

        const relation = parseMaRelation(value);
        if (relation === null) continue;

        const operator = relation.direction === 'abv' ? '$gt' : '$lt';
        const rhs = relation.target === 'price' ? '$TimeSeries.close' : `$MA${relation.target}`;
        expressions.push({ [operator]: [`$${spec.path}`, rhs] });
    }

    for (const spec of FLAG_FILTERS) {
        if (filters[spec.field] !== true) continue;
        const extreme = spec.field === 'NewHigh' ? '$fiftytwoWeekHigh' : '$fiftytwoWeekLow';
        const operator = spec.field === 'NewHigh' ? '$gte' : '$lte';
        expressions.push({ [operator]: ['$TimeSeries.close', extreme] });
    }

    if (hiddenSymbols.length > 0) query.Symbol = { $nin: hiddenSymbols };
    if (expressions.length > 0) query.$and = expressions.map((expr) => ({ $expr: expr }));

    return query;
}

export async function runScreener(
    userId: ObjectId,
    screenerName: string,
    options: { page: number; limit: number; columns?: string[]; hiddenSymbols?: string[] },
): Promise<ScreenerResultPage> {
    const screener = await getScreener(userId, screenerName);
    const { page, limit, columns = [], hiddenSymbols = [] } = options;

    return withCache(
        userKey(userId.toHexString(), 'screener', screener._id.toHexString(), String(page), String(limit)),
        () => executeQuery(buildQuery(screener.filters, hiddenSymbols), { page, limit, columns }),
        { dataType: 'price' },
    );
}

/** Run every screener the user has switched on, as one query. */
export async function runIncludedScreeners(
    userId: ObjectId,
    options: { page: number; limit: number; columns?: string[]; hiddenSymbols?: string[] },
): Promise<ScreenerResultPage> {
    const { page, limit, columns = [], hiddenSymbols = [] } = options;

    const screeners = await getDb().collection<ScreenerDoc>('Screeners').find({ userId, include: true }).toArray();

    if (screeners.length === 0) return { items: [], total: 0, page, pages: 0 };

    const branches = screeners.map((screener) => buildQuery(screener.filters, hiddenSymbols));
    // A screener with no filters matches everything, which would make the whole
    // $or match everything — so an empty branch collapses the union to itself.
    const query: Filter<AssetInfoDoc> = branches.some((branch) => Object.keys(branch).length === 0)
        ? {}
        : { $or: branches };

    return withCache(
        userKey(userId.toHexString(), 'screener', 'combined', String(page), String(limit)),
        () => executeQuery(query, { page, limit, columns }),
        { dataType: 'price' },
    );
}

async function executeQuery(
    query: Filter<AssetInfoDoc>,
    options: { page: number; limit: number; columns: string[] },
): Promise<ScreenerResultPage> {
    const { page, limit, columns } = options;
    const assets = getDb().collection<AssetInfoDoc>('AssetInfo');
    const projection = buildProjection(columns);

    // Count and page are independent, so they go in parallel rather than
    // waiting on each other — the count is the slower of the two.
    const [items, total] = await Promise.all([
        assets
            .find(query, { projection })
            .sort({ Symbol: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
        assets.countDocuments(query),
    ]);

    return {
        items: items.map(toResult),
        total,
        page,
        pages: Math.ceil(total / limit),
    };
}

function buildProjection(columns: string[]): Record<string, 0 | 1> {
    const allowed = new Set<string>([
        ...RANGE_FILTERS.map((spec) => spec.queryPath),
        ...ENUM_FILTERS.map((spec) => spec.queryPath),
        ...MA_FILTERS.map((spec) => spec.path),
    ]);

    const projection: Record<string, 0 | 1> = { ...BASE_PROJECTION };
    for (const column of columns) {
        if (allowed.has(column)) projection[column] = 1;
    }
    return projection;
}

function toResult(doc: AssetInfoDoc): ScreenerResult {
    const { Symbol, Name, AssetType, Sector, Exchange, ...rest } = doc;
    return {
        ...rest,
        symbol: Symbol,
        name: Name ?? null,
        assetType: AssetType ?? null,
        sector: Sector ?? null,
        exchange: Exchange ?? null,
    };
}

/** A stored date range: two parseable ISO-8601 strings. */
function isDateRange(value: unknown): value is [string, string] {
    return (
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'string' &&
        typeof value[1] === 'string' &&
        !Number.isNaN(Date.parse(value[0])) &&
        !Number.isNaN(Date.parse(value[1]))
    );
}

function isRange(value: unknown): value is [number, number] {
    return (
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'number' &&
        typeof value[1] === 'number' &&
        Number.isFinite(value[0]) &&
        Number.isFinite(value[1])
    );
}

/** Parse the stored `abv200` / `blwPrice` shorthand into its two parts. */
function parseMaRelation(value: string): { direction: 'abv' | 'blw'; target: string } | null {
    const match = /^(abv|blw)(10|20|50|200|[Pp]rice)$/.exec(value);
    if (match === null) return null;
    return { direction: match[1] as 'abv' | 'blw', target: match[2]!.toLowerCase() === 'price' ? 'price' : match[2]! };
}
