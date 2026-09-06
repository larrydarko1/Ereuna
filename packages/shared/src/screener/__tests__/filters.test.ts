import { describe, expect, it } from 'vitest';
import {
    ALL_FILTER_FIELDS,
    ALL_FILTER_KEYS,
    DATE_FILTERS,
    ENUM_FILTERS,
    FLAG_FILTERS,
    MA_DIRECTIONS,
    MA_FILTERS,
    MA_TARGETS,
    RANGE_FILTERS,
    filterField,
    findDateFilter,
    findEnumFilter,
    findFlagFilter,
    findMaFilter,
    findRangeFilter,
} from '#screener/filters.js';

describe('the registry as a whole', () => {
    it('has no key collision across the five families — the API resolves `:filter` against all of them', () => {
        expect(new Set(ALL_FILTER_KEYS).size).toBe(ALL_FILTER_KEYS.length);
    });

    it('has no field collision — two filters writing one field would overwrite each other', () => {
        expect(new Set(ALL_FILTER_FIELDS).size).toBe(ALL_FILTER_FIELDS.length);
    });

    it('lists exactly as many fields as keys', () => {
        expect(ALL_FILTER_FIELDS).toHaveLength(ALL_FILTER_KEYS.length);
    });

    it('uses kebab-case keys, which are URL slugs', () => {
        for (const key of ALL_FILTER_KEYS) expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });
});

describe('filterField', () => {
    it('maps every key to its storage field', () => {
        for (const key of ALL_FILTER_KEYS) expect(ALL_FILTER_FIELDS).toContain(filterField(key));
    });

    it('translates the API name to the database name where they diverge', () => {
        expect(filterField('pe')).toBe('PE');
        expect(filterField('market-cap')).toBe('MarketCap');
        expect(filterField('change-1m')).toBe('change1m');
    });

    it('returns undefined for an unknown key rather than guessing', () => {
        expect(filterField('not-a-filter')).toBeUndefined();
    });
});

describe('findRangeFilter', () => {
    it('resolves every declared range key', () => {
        for (const spec of RANGE_FILTERS) expect(findRangeFilter(spec.key)).toBe(spec);
    });

    it('returns null for a key from another family, so a lookup cannot cross families', () => {
        expect(findRangeFilter('sectors')).toBeNull();
        expect(findRangeFilter('ipo-date')).toBeNull();
        expect(findRangeFilter('')).toBeNull();
    });

    it('gives every range filter a bounds source', () => {
        for (const spec of RANGE_FILTERS) {
            expect(['fixed', 'derived', 'latestClose']).toContain(spec.bounds.kind);
        }
    });

    it('gives a fixed-bounds filter a min below its max', () => {
        const fixed = RANGE_FILTERS.filter((spec) => spec.bounds.kind === 'fixed');
        expect(fixed.length).toBeGreaterThan(0);
        for (const spec of fixed) {
            if (spec.bounds.kind !== 'fixed') continue;
            expect(spec.bounds.min).toBeLessThan(spec.bounds.max);
        }
    });

    it('bounds price on the latest close rather than on the stored range', () => {
        expect(findRangeFilter('price')?.bounds).toEqual({ kind: 'latestClose' });
    });

    it('scores RSI 1–100', () => {
        expect(findRangeFilter('rsi')?.bounds).toEqual({ kind: 'fixed', min: 1, max: 100 });
    });
});

describe('findEnumFilter', () => {
    it('resolves every declared enum key', () => {
        for (const spec of ENUM_FILTERS) expect(findEnumFilter(spec.key)).toBe(spec);
    });

    it('returns null for a range key', () => {
        expect(findEnumFilter('pe')).toBeNull();
    });

    it('enumerates each categorical filter from its own AssetInfo path', () => {
        for (const spec of ENUM_FILTERS) expect(spec.options.path).toBe(spec.queryPath);
    });
});

describe('findDateFilter', () => {
    it('resolves every declared date key', () => {
        for (const spec of DATE_FILTERS) expect(findDateFilter(spec.key)).toBe(spec);
    });

    it('returns null for a range key — a Date compared against a number matches nothing', () => {
        expect(findDateFilter('price')).toBeNull();
    });
});

describe('findMaFilter', () => {
    it('resolves every declared MA key', () => {
        for (const spec of MA_FILTERS) expect(findMaFilter(spec.key)).toBe(spec);
    });

    it('returns null for an unknown key', () => {
        expect(findMaFilter('ma-100')).toBeNull();
    });

    it('offers every MA period as a comparison target, plus the price', () => {
        const periods = MA_FILTERS.map((spec) => spec.key.replace('ma-', ''));
        for (const period of periods) expect(MA_TARGETS).toContain(period);
        expect(MA_TARGETS).toContain('price');
    });

    it('has exactly two directions', () => {
        expect(MA_DIRECTIONS).toEqual(['abv', 'blw']);
    });
});

describe('findFlagFilter', () => {
    it('resolves every declared flag key', () => {
        for (const spec of FLAG_FILTERS) expect(findFlagFilter(spec.key)).toBe(spec);
    });

    it('returns null for an unknown key', () => {
        expect(findFlagFilter('new-middle')).toBeNull();
    });
});
