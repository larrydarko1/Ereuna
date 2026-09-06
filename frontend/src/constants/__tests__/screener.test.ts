import { describe, expect, it } from 'vitest';
import { ALL_FILTER_KEYS, ENUM_FILTERS, MA_FILTERS, RANGE_FILTERS } from '@ereuna/shared';
import { COLUMNS, DEFAULT_COLUMNS, FILTER_GROUPS, filterGroup, findColumn, readColumn } from '@/constants/screener';

describe('filterGroup', () => {
    it('gives every filter the API serves a heading of its own', () => {
        const ungrouped = ALL_FILTER_KEYS.filter((key) => filterGroup(key) === 'classification');
        const classification = ['asset-types', 'sectors', 'exchanges', 'countries', 'ipo-date'];

        expect(ungrouped.slice().sort()).toEqual(classification.slice().sort());
    });

    it('groups a filter this table has not caught up with rather than dropping it', () => {
        expect(FILTER_GROUPS).toContain(filterGroup('a-filter-added-yesterday'));
    });

    it('reads a heading off the table rather than off the spelling of the key', () => {
        expect(filterGroup('net-expense-ratio')).toBe('funds');
        expect(filterGroup('cash-equivalents')).toBe('balanceSheet');
        expect(filterGroup('current-ratio')).toBe('balanceSheet');
    });
});

describe('COLUMNS', () => {
    it('offers exactly the paths some filter names — anything else renders empty', () => {
        expect(COLUMNS).toHaveLength(RANGE_FILTERS.length + ENUM_FILTERS.length + MA_FILTERS.length);
    });

    it('formats a percentage as one, rather than scaling it a second time', () => {
        expect(findColumn('DividendYield')?.format).toBe('percent');
    });

    it('compacts what is measured in money or shares', () => {
        expect(findColumn('MarketCapitalization')?.format).toBe('compact');
    });

    it('leaves everything else a plain number', () => {
        expect(findColumn('PERatio')?.format).toBe('number');
    });

    it('reads an option list as text', () => {
        expect(findColumn('Sector')?.format).toBe('text');
    });

    it('answers with nothing for a path no filter names', () => {
        expect(findColumn('NoSuchPath')).toBeNull();
    });

    it('offers a default set that every column in it can actually render', () => {
        for (const path of DEFAULT_COLUMNS) expect(COLUMNS.some((column) => column.path === path)).toBe(true);
    });
});

describe('readColumn', () => {
    it('reads a flat key', () => {
        expect(readColumn({ PERatio: 24.9 }, 'PERatio')).toBe(24.9);
    });

    it('steps through a dotted path', () => {
        expect(readColumn({ TimeSeries: { close: 180 } }, 'TimeSeries.close')).toBe(180);
    });

    it('steps through an array index', () => {
        expect(readColumn({ quarterlyFinancials: [{ roe: 0.2 }] }, 'quarterlyFinancials.0.roe')).toBe(0.2);
    });

    it('answers null when the path runs out', () => {
        expect(readColumn({}, 'TimeSeries.close')).toBeNull();
        expect(readColumn({ TimeSeries: null }, 'TimeSeries.close')).toBeNull();
        expect(readColumn({ TimeSeries: 5 }, 'TimeSeries.close')).toBeNull();
    });

    it('answers null rather than undefined for a missing leaf', () => {
        expect(readColumn({ TimeSeries: {} }, 'TimeSeries.close')).toBeNull();
    });

    it('keeps a legitimate zero', () => {
        expect(readColumn({ PERatio: 0 }, 'PERatio')).toBe(0);
    });
});
