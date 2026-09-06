import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DateFilterSpec, EnumFilterSpec, RangeFilterSpec } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const cache: { keys: string[]; options: unknown[] } = { keys: [], options: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/cache.js', () => ({
    marketKey: (...parts: string[]) => `m:${parts.join(':')}`,
    // Pass-through, so the fetcher runs and its result is what the test reads.
    withCache: (key: string, fetcher: () => Promise<unknown>, options: unknown) => {
        cache.keys.push(key);
        cache.options.push(options);
        return fetcher();
    },
}));

const { getDateBounds, getEnumOptions, getRangeBounds, tryGetBounds } =
    await import('@/services/screener/screener-bounds.js');

const derived: RangeFilterSpec = {
    key: 'pe',
    field: 'PE',
    queryPath: 'PERatio',
    label: 'P/E ratio',
    bounds: { kind: 'derived' },
};

const pipelineOf = (): Record<string, unknown>[] =>
    (db.current.of('AssetInfo').filters[0] as Record<string, unknown>[]) ?? [];

beforeEach(() => {
    db.current = fakeDb({ AssetInfo: [] });
    cache.keys = [];
    cache.options = [];
});

describe('getRangeBounds', () => {
    it('answers a fixed-bounds filter from the registry without touching the database', async () => {
        const rsi: RangeFilterSpec = { ...derived, key: 'rsi', bounds: { kind: 'fixed', min: 1, max: 100 } };
        await expect(getRangeBounds(rsi)).resolves.toEqual({ min: 1, max: 100 });
        expect(db.current.collection).not.toHaveBeenCalled();
    });

    it('derives a numeric filter from `$min`/`$max` over its own path', async () => {
        db.current = fakeDb({ AssetInfo: [{ min: 1.234, max: 45.678 }] });
        await expect(getRangeBounds(derived)).resolves.toEqual({ min: 1.23, max: 45.68 });
    });

    it('rounds the floor down and the ceiling up, so no row falls outside the slider', async () => {
        db.current = fakeDb({ AssetInfo: [{ min: 1.239, max: 45.671 }] });
        await expect(getRangeBounds(derived)).resolves.toEqual({ min: 1.23, max: 45.68 });
    });

    it('restricts to numeric values — the ingestor writes the string `None` for missing data', async () => {
        db.current = fakeDb({ AssetInfo: [{ min: 1, max: 2 }] });
        await getRangeBounds(derived);
        expect(pipelineOf()[0]).toEqual({ $match: { PERatio: { $type: 'number' } } });
    });

    it('indexes an array path explicitly — a dotted index resolves to nothing in an expression', async () => {
        const roe: RangeFilterSpec = { ...derived, key: 'roe', queryPath: 'quarterlyFinancials.0.roe' };
        db.current = fakeDb({ AssetInfo: [{ min: 1, max: 2 }] });
        await getRangeBounds(roe);

        const group = pipelineOf()[1] as { $group: { min: { $min: unknown } } };
        expect(group.$group.min.$min).toEqual({ $arrayElemAt: ['$quarterlyFinancials.roe', 0] });
    });

    it('bounds price from the OHLCV series, with a floor of zero', async () => {
        const price: RangeFilterSpec = { ...derived, key: 'price', bounds: { kind: 'latestClose' } };
        db.current = fakeDb({ AssetInfo: [{ max: 987.651 }] });
        await expect(getRangeBounds(price)).resolves.toEqual({ min: 0, max: 987.66 });
    });

    it.each([
        ['nothing came back', []],
        ['the aggregate produced nulls', [{ min: null, max: null }]],
    ])('reports the bound as unavailable when %s', async (_label, seed) => {
        db.current = fakeDb({ AssetInfo: seed });
        await expect(getRangeBounds(derived)).rejects.toMatchObject({ code: 'FILTER_BOUND_UNAVAILABLE' });
    });

    it('reports the price bound as unavailable when there is no price data', async () => {
        const price: RangeFilterSpec = { ...derived, key: 'price', bounds: { kind: 'latestClose' } };
        db.current = fakeDb({ AssetInfo: [{ max: null }] });
        await expect(getRangeBounds(price)).rejects.toMatchObject({ code: 'FILTER_BOUND_UNAVAILABLE' });
    });

    it('caches under the filter key, as reference data', async () => {
        db.current = fakeDb({ AssetInfo: [{ min: 1, max: 2 }] });
        await getRangeBounds(derived);
        expect(cache.keys).toEqual(['m:bounds:pe']);
        expect(cache.options).toEqual([{ dataType: 'static' }]);
    });
});

describe('getEnumOptions', () => {
    const sectors: EnumFilterSpec = {
        key: 'sectors',
        field: 'Sectors',
        queryPath: 'Sector',
        label: 'Sector',
        options: { path: 'Sector' },
    };

    it('reads the distinct values, excluding the placeholders the ingestor writes', async () => {
        db.current = fakeDb({ AssetInfo: ['Technology'] });
        await getEnumOptions(sectors);
        expect(db.current.of('AssetInfo').distinct).toHaveBeenCalledWith('Sector', {
            Sector: { $nin: [null, '', 'None'] },
        });
    });

    it('sorts for stable display', async () => {
        db.current = fakeDb({ AssetInfo: ['Utilities', 'Energy', 'Technology'] });
        await expect(getEnumOptions(sectors)).resolves.toEqual(['Energy', 'Technology', 'Utilities']);
    });

    it('drops a non-string value rather than rendering it', async () => {
        db.current = fakeDb({ AssetInfo: ['Energy', 42, null] });
        await expect(getEnumOptions(sectors)).resolves.toEqual(['Energy']);
    });

    it('returns nothing for a column with no values yet', async () => {
        db.current = fakeDb({ AssetInfo: [] });
        await expect(getEnumOptions(sectors)).resolves.toEqual([]);
    });

    it('caches under the filter key', async () => {
        db.current = fakeDb({ AssetInfo: [] });
        await getEnumOptions(sectors);
        expect(cache.keys).toEqual(['m:options:sectors']);
    });
});

describe('getDateBounds', () => {
    const ipo: DateFilterSpec = { key: 'ipo-date', field: 'IPO', queryPath: 'IPO', label: 'IPO date' };

    it('returns the span as ISO strings', async () => {
        db.current = fakeDb({
            AssetInfo: [{ min: new Date('1980-12-12T00:00:00.000Z'), max: new Date('2026-01-02T00:00:00.000Z') }],
        });
        await expect(getDateBounds(ipo)).resolves.toEqual({
            min: '1980-12-12T00:00:00.000Z',
            max: '2026-01-02T00:00:00.000Z',
        });
    });

    it('restricts to documents where the path actually holds a date', async () => {
        db.current = fakeDb({ AssetInfo: [{ min: new Date(), max: new Date() }] });
        await getDateBounds(ipo);
        expect(pipelineOf()[0]).toEqual({ $match: { IPO: { $type: 'date' } } });
    });

    it.each([
        ['nothing came back', []],
        ['the aggregate produced nulls', [{ min: null, max: null }]],
    ])('reports the bound as unavailable when %s', async (_label, seed) => {
        db.current = fakeDb({ AssetInfo: seed });
        await expect(getDateBounds(ipo)).rejects.toMatchObject({ code: 'FILTER_BOUND_UNAVAILABLE' });
    });
});

describe('tryGetBounds', () => {
    it('passes a resolved value through', async () => {
        await expect(tryGetBounds(() => Promise.resolve({ min: 1, max: 2 }))).resolves.toEqual({ min: 1, max: 2 });
    });

    it('reports an unpopulated column as null — one absent metric must not blank the whole panel', async () => {
        const unavailable = new AppError(422, 'FILTER_BOUND_UNAVAILABLE', 'nothing there');
        await expect(tryGetBounds(() => Promise.reject(unavailable))).resolves.toBeNull();
    });

    it('lets any other failure through, rather than reporting it as an empty filter', async () => {
        await expect(tryGetBounds(() => Promise.reject(new Error('mongo down')))).rejects.toThrow('mongo down');
        const other = new AppError(500, 'INTERNAL', 'boom');
        await expect(tryGetBounds(() => Promise.reject(other))).rejects.toThrow(AppError);
    });
});
