/**
 * screener-filters — applying, clearing and reading a screener's filters.
 * Owns: writing a validated filter value onto a screener document.
 * Does NOT own: deriving bounds and options (screener-bounds.ts) or turning
 * stored filters into a query (screener-query.ts).
 */
import { ObjectId, type WithId } from 'mongodb';
import {
    findDateFilter,
    findEnumFilter,
    findFlagFilter,
    findMaFilter,
    findRangeFilter,
    MA_DIRECTIONS,
    MA_TARGETS,
    ALL_FILTER_FIELDS,
    type ScreenerDoc,
    type ScreenerFilterValue,
} from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { getDb } from '@/lib/db.js';
import { getDateBounds, getEnumOptions, getRangeBounds } from '@/services/screener/screener-bounds.js';
import { getScreener, invalidateResults } from '@/services/screener/screener-crud.js';

export type RangeInput = { min?: number; max?: number };

export async function setRangeFilter(
    userId: ObjectId,
    screenerName: string,
    filterKey: string,
    input: RangeInput,
): Promise<WithId<ScreenerDoc>> {
    const spec = findRangeFilter(filterKey);
    if (spec === undefined) throw unknownFilter(filterKey);

    if (input.min === undefined && input.max === undefined) {
        throw new AppError(422, 'FILTER_RANGE_INVALID', `${spec.label} needs at least one of min or max`, {
            params: { filter: spec.key },
        });
    }

    const bounds = await getRangeBounds(spec);
    const min = input.min ?? bounds.min;
    const max = input.max ?? bounds.max;

    if (min >= max) {
        throw new AppError(422, 'FILTER_RANGE_INVALID', `${spec.label} min ${min} is not below max ${max}`, {
            params: { filter: spec.key },
        });
    }

    return writeFilter(userId, screenerName, spec.field, [min, max]);
}

export async function setEnumFilter(
    userId: ObjectId,
    screenerName: string,
    filterKey: string,
    values: string[],
): Promise<WithId<ScreenerDoc>> {
    const spec = findEnumFilter(filterKey);
    if (spec === undefined) throw unknownFilter(filterKey);

    const allowed = new Set(await getEnumOptions(spec));
    const unknown = values.find((value) => !allowed.has(value));
    if (unknown !== undefined) {
        throw new AppError(422, 'INVALID_FILTER_OPTION', `${unknown} is not a valid ${spec.label}`, {
            params: { filter: spec.key },
        });
    }

    return writeFilter(userId, screenerName, spec.field, [...new Set(values)]);
}

export async function setDateFilter(
    userId: ObjectId,
    screenerName: string,
    filterKey: string,
    input: { from?: string; to?: string },
): Promise<WithId<ScreenerDoc>> {
    const spec = findDateFilter(filterKey);
    if (spec === undefined) throw unknownFilter(filterKey);

    if (input.from === undefined && input.to === undefined) {
        throw new AppError(422, 'FILTER_RANGE_INVALID', `${spec.label} needs at least one of from or to`, {
            params: { filter: spec.key },
        });
    }

    const bounds = await getDateBounds(spec);
    const from = input.from ?? bounds.min;
    const to = input.to ?? bounds.max;

    if (Date.parse(from) >= Date.parse(to)) {
        throw new AppError(422, 'FILTER_RANGE_INVALID', `${spec.label} from ${from} is not before to ${to}`, {
            params: { filter: spec.key },
        });
    }

    return writeFilter(userId, screenerName, spec.field, [from, to]);
}

export async function setMaFilter(
    userId: ObjectId,
    screenerName: string,
    filterKey: string,
    direction: string,
    target: string,
): Promise<WithId<ScreenerDoc>> {
    const spec = findMaFilter(filterKey);
    if (spec === undefined) throw unknownFilter(filterKey);

    if (!(MA_DIRECTIONS as readonly string[]).includes(direction) || !(MA_TARGETS as readonly string[]).includes(target)) {
        throw new AppError(422, 'INVALID_FILTER_OPTION', `${direction}/${target} is not a valid MA relation`, {
            params: { filter: spec.key },
        });
    }

    if (spec.path === `MA${target}`) {
        throw new AppError(422, 'INVALID_FILTER_OPTION', `${spec.label} cannot be compared against itself`, {
            params: { filter: spec.key },
        });
    }

    return writeFilter(userId, screenerName, spec.field, `${direction}${target}`);
}

/** Set a boolean flag filter (at a new 52-week high or low). */
export async function setFlagFilter(
    userId: ObjectId,
    screenerName: string,
    filterKey: string,
    enabled: boolean,
): Promise<WithId<ScreenerDoc>> {
    const spec = findFlagFilter(filterKey);
    if (spec === undefined) throw unknownFilter(filterKey);
    return writeFilter(userId, screenerName, spec.field, enabled);
}

export async function clearFilter(userId: ObjectId, screenerName: string, filterKey: string): Promise<WithId<ScreenerDoc>> {
    const field = resolveField(filterKey);

    const updated = await getDb()
        .collection<ScreenerDoc>('Screeners')
        .findOneAndUpdate(
            { userId, nameLower: screenerName.toLowerCase() },
            { $unset: { [`filters.${field}`]: '' }, $set: { updatedAt: new Date() } },
            { returnDocument: 'after' },
        );

    if (updated === null) throw new AppError(404, 'SCREENER_NOT_FOUND', `screener ${screenerName} not found`);

    await invalidateResults(userId);
    return updated;
}

export async function resetFilters(userId: ObjectId, screenerName: string): Promise<WithId<ScreenerDoc>> {
    const unset: Record<string, ''> = Object.fromEntries(ALL_FILTER_FIELDS.map((field) => [`filters.${field}`, '' as const]));

    const updated = await getDb()
        .collection<ScreenerDoc>('Screeners')
        .findOneAndUpdate(
            { userId, nameLower: screenerName.toLowerCase() },
            { $unset: unset, $set: { updatedAt: new Date() } },
            { returnDocument: 'after' },
        );

    if (updated === null) throw new AppError(404, 'SCREENER_NOT_FOUND', `screener ${screenerName} not found`);

    await invalidateResults(userId);
    return updated;
}

export async function listFilters(userId: ObjectId, screenerName: string): Promise<Record<string, ScreenerFilterValue>> {
    return (await getScreener(userId, screenerName)).filters;
}

async function writeFilter(
    userId: ObjectId,
    screenerName: string,
    field: string,
    value: ScreenerFilterValue,
): Promise<WithId<ScreenerDoc>> {
    const updated = await getDb()
        .collection<ScreenerDoc>('Screeners')
        .findOneAndUpdate(
            { userId, nameLower: screenerName.toLowerCase() },
            { $set: { [`filters.${field}`]: value, updatedAt: new Date() } },
            { returnDocument: 'after' },
        );

    if (updated === null) throw new AppError(404, 'SCREENER_NOT_FOUND', `screener ${screenerName} not found`);

    await invalidateResults(userId);
    return updated;
}

function resolveField(filterKey: string): string {
    const spec =
        findRangeFilter(filterKey) ??
        findEnumFilter(filterKey) ??
        findDateFilter(filterKey) ??
        findMaFilter(filterKey) ??
        findFlagFilter(filterKey);
    if (spec === undefined) throw unknownFilter(filterKey);
    return spec.field;
}

function unknownFilter(filterKey: string): AppError {
    return new AppError(422, 'UNKNOWN_SCREENER_FILTER', `no screener filter named ${filterKey}`, {
        params: { filter: filterKey },
    });
}
