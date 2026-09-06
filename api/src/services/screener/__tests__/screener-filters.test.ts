import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { ALL_FILTER_FIELDS } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const bounds: { range: { min: number; max: number }; options: string[]; date: { min: string; max: string } } = {
    range: { min: 0, max: 100 },
    options: ['Technology', 'Energy'],
    date: { min: '1980-01-01T00:00:00.000Z', max: '2026-01-01T00:00:00.000Z' },
};
const cache: { invalidated: string[] } = { invalidated: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/services/screener/screener-bounds.js', () => ({
    getRangeBounds: () => Promise.resolve(bounds.range),
    getEnumOptions: () => Promise.resolve(bounds.options),
    getDateBounds: () => Promise.resolve(bounds.date),
}));
vi.mock('@/services/screener/screener-crud.js', () => ({
    invalidateResults: (userId: ObjectId) => {
        cache.invalidated.push(userId.toHexString());
        return Promise.resolve();
    },
}));

const { clearFilter, resetFilters, setDateFilter, setEnumFilter, setFlagFilter, setMaFilter, setRangeFilter } =
    await import('@/services/screener/screener-filters.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

const updateOf = (): { $set?: Record<string, unknown>; $unset?: Record<string, string> } =>
    db.current.of('Screeners').writes[0]?.args[1] as { $set?: Record<string, unknown> };

beforeEach(() => {
    db.current = fakeDb({ Screeners: [{ _id: new ObjectId(), filters: {} }] });
    bounds.range = { min: 0, max: 100 };
    bounds.options = ['Technology', 'Energy'];
    bounds.date = { min: '1980-01-01T00:00:00.000Z', max: '2026-01-01T00:00:00.000Z' };
    cache.invalidated = [];
});

describe('setRangeFilter', () => {
    it("writes the pair under the filter's storage field, not its url key", async () => {
        await setRangeFilter(USER_ID, 'Growth', 'pe', { min: 5, max: 20 });
        expect(updateOf().$set).toMatchObject({ 'filters.PE': [5, 20] });
    });

    it('fills the omitted side from the data, so a one-sided range needs no prior knowledge', async () => {
        await setRangeFilter(USER_ID, 'Growth', 'pe', { max: 15 });
        expect(updateOf().$set).toMatchObject({ 'filters.PE': [0, 15] });

        db.current = fakeDb({ Screeners: [{ _id: new ObjectId() }] });
        await setRangeFilter(USER_ID, 'Growth', 'pe', { min: 15 });
        expect(updateOf().$set).toMatchObject({ 'filters.PE': [15, 100] });
    });

    it('refuses a range with neither side', async () => {
        await expect(setRangeFilter(USER_ID, 'Growth', 'pe', {})).rejects.toMatchObject({
            code: 'FILTER_RANGE_INVALID',
            params: { filter: 'pe' },
        });
    });

    it.each([
        ['inverted', { min: 20, max: 5 }],
        ['collapsed to a point', { min: 5, max: 5 }],
    ])('refuses a range that is %s', async (_label, input) => {
        await expect(setRangeFilter(USER_ID, 'Growth', 'pe', input)).rejects.toMatchObject({
            code: 'FILTER_RANGE_INVALID',
        });
    });

    it('refuses a filter key from another family', async () => {
        await expect(setRangeFilter(USER_ID, 'Growth', 'sectors', { min: 1 })).rejects.toMatchObject({
            code: 'UNKNOWN_SCREENER_FILTER',
            params: { filter: 'sectors' },
        });
    });

    it('drops the cached results', async () => {
        await setRangeFilter(USER_ID, 'Growth', 'pe', { min: 5, max: 20 });
        expect(cache.invalidated).toEqual([USER_ID.toHexString()]);
    });

    it('refuses a screener that does not exist', async () => {
        db.current.of('Screeners').results.findOneAndUpdate = null;
        await expect(setRangeFilter(USER_ID, 'Nope', 'pe', { min: 1, max: 2 })).rejects.toMatchObject({
            code: 'SCREENER_NOT_FOUND',
        });
    });
});

describe('setEnumFilter', () => {
    it('writes the selected values under the storage field', async () => {
        await setEnumFilter(USER_ID, 'Growth', 'sectors', ['Technology']);
        expect(updateOf().$set).toMatchObject({ 'filters.Sectors': ['Technology'] });
    });

    it('de-duplicates the selection', async () => {
        await setEnumFilter(USER_ID, 'Growth', 'sectors', ['Technology', 'Technology']);
        expect(updateOf().$set).toMatchObject({ 'filters.Sectors': ['Technology'] });
    });

    it('refuses a value outside the option set, so it cannot silently match nothing', async () => {
        await expect(setEnumFilter(USER_ID, 'Growth', 'sectors', ['Atlantis'])).rejects.toMatchObject({
            code: 'INVALID_FILTER_OPTION',
            params: { filter: 'sectors' },
        });
    });

    it('accepts an empty selection', async () => {
        await setEnumFilter(USER_ID, 'Growth', 'sectors', []);
        expect(updateOf().$set).toMatchObject({ 'filters.Sectors': [] });
    });

    it('refuses a key from another family', async () => {
        await expect(setEnumFilter(USER_ID, 'Growth', 'pe', [])).rejects.toMatchObject({
            code: 'UNKNOWN_SCREENER_FILTER',
        });
    });
});

describe('setDateFilter', () => {
    it('writes the span as a pair of strings', async () => {
        await setDateFilter(USER_ID, 'Growth', 'ipo-date', { from: '2000-01-01', to: '2010-01-01' });
        expect(updateOf().$set).toMatchObject({ 'filters.IPO': ['2000-01-01', '2010-01-01'] });
    });

    it('fills the omitted side from the data', async () => {
        await setDateFilter(USER_ID, 'Growth', 'ipo-date', { to: '2010-01-01' });
        expect(updateOf().$set).toMatchObject({ 'filters.IPO': [bounds.date.min, '2010-01-01'] });
    });

    it('refuses a span with neither side', async () => {
        await expect(setDateFilter(USER_ID, 'Growth', 'ipo-date', {})).rejects.toMatchObject({
            code: 'FILTER_RANGE_INVALID',
        });
    });

    it.each([
        ['inverted', { from: '2010-01-01', to: '2000-01-01' }],
        ['collapsed to a day', { from: '2010-01-01', to: '2010-01-01' }],
    ])('refuses a span that is %s', async (_label, input) => {
        await expect(setDateFilter(USER_ID, 'Growth', 'ipo-date', input)).rejects.toMatchObject({
            code: 'FILTER_RANGE_INVALID',
        });
    });

    it('refuses a key from another family', async () => {
        await expect(setDateFilter(USER_ID, 'Growth', 'pe', { from: '2000-01-01' })).rejects.toMatchObject({
            code: 'UNKNOWN_SCREENER_FILTER',
        });
    });
});

describe('setMaFilter', () => {
    it('writes the relation as one token', async () => {
        await setMaFilter(USER_ID, 'Growth', 'ma-50', 'abv', '200');
        expect(updateOf().$set).toMatchObject({ 'filters.MA50': 'abv200' });
    });

    it('compares against the price as well as another average', async () => {
        await setMaFilter(USER_ID, 'Growth', 'ma-50', 'blw', 'price');
        expect(updateOf().$set).toMatchObject({ 'filters.MA50': 'blwprice' });
    });

    it.each([
        ['an unknown direction', 'sideways', '200'],
        ['an unknown target', 'abv', '9999'],
    ])('refuses %s', async (_label, direction, target) => {
        await expect(setMaFilter(USER_ID, 'Growth', 'ma-50', direction, target)).rejects.toMatchObject({
            code: 'INVALID_FILTER_OPTION',
        });
    });

    it('refuses an average compared against itself', async () => {
        await expect(setMaFilter(USER_ID, 'Growth', 'ma-50', 'abv', '50')).rejects.toMatchObject({
            code: 'INVALID_FILTER_OPTION',
            params: { filter: 'ma-50' },
        });
    });

    it('refuses a key from another family', async () => {
        await expect(setMaFilter(USER_ID, 'Growth', 'pe', 'abv', '200')).rejects.toMatchObject({
            code: 'UNKNOWN_SCREENER_FILTER',
        });
    });
});

describe('setFlagFilter', () => {
    it.each([true, false])('writes the flag as %s', async (enabled) => {
        await setFlagFilter(USER_ID, 'Growth', 'new-high', { enabled });
        expect(updateOf().$set).toMatchObject({ 'filters.NewHigh': enabled });
    });

    it('refuses a key from another family', async () => {
        await expect(setFlagFilter(USER_ID, 'Growth', 'pe', { enabled: true })).rejects.toMatchObject({
            code: 'UNKNOWN_SCREENER_FILTER',
        });
    });
});

describe('clearFilter', () => {
    it.each([
        ['a range filter', 'pe', 'filters.PE'],
        ['an enum filter', 'sectors', 'filters.Sectors'],
        ['a date filter', 'ipo-date', 'filters.IPO'],
        ['an MA filter', 'ma-50', 'filters.MA50'],
        ['a flag filter', 'new-high', 'filters.NewHigh'],
    ])('unsets %s by resolving its field across every family', async (_label, key, field) => {
        await clearFilter(USER_ID, 'Growth', key);
        expect(updateOf().$unset).toEqual({ [field]: '' });
    });

    it('refuses an unknown key', async () => {
        await expect(clearFilter(USER_ID, 'Growth', 'not-a-filter')).rejects.toMatchObject({
            code: 'UNKNOWN_SCREENER_FILTER',
        });
    });

    it('refuses a screener that does not exist', async () => {
        db.current.of('Screeners').results.findOneAndUpdate = null;
        await expect(clearFilter(USER_ID, 'Nope', 'pe')).rejects.toMatchObject({ code: 'SCREENER_NOT_FOUND' });
    });

    it('drops the cached results', async () => {
        await clearFilter(USER_ID, 'Growth', 'pe');
        expect(cache.invalidated).toHaveLength(1);
    });
});

describe('resetFilters', () => {
    it('unsets every filter field and nothing else', async () => {
        await resetFilters(USER_ID, 'Growth');
        const unset = Object.keys(updateOf().$unset ?? {});

        expect(unset).toHaveLength(ALL_FILTER_FIELDS.length);
        for (const field of ALL_FILTER_FIELDS) expect(unset).toContain(`filters.${field}`);
    });

    it('cannot touch a document field outside `filters`', async () => {
        await resetFilters(USER_ID, 'Growth');
        for (const key of Object.keys(updateOf().$unset ?? {})) expect(key.startsWith('filters.')).toBe(true);
    });

    it('refuses a screener that does not exist', async () => {
        db.current.of('Screeners').results.findOneAndUpdate = null;
        await expect(resetFilters(USER_ID, 'Nope')).rejects.toMatchObject({ code: 'SCREENER_NOT_FOUND' });
    });

    it('drops the cached results', async () => {
        await resetFilters(USER_ID, 'Growth');
        expect(cache.invalidated).toHaveLength(1);
    });
});
