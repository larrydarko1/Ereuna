import { describe, expect, it } from 'vitest';

import { ALL_FILTER_KEYS, ENUM_FILTERS, MA_FILTERS, RANGE_FILTERS, toResultColumns } from '@ereuna/shared';

import { screenerResult } from '@/__tests__/support/answers';
import {
    COLUMNS,
    FILTER_GROUPS,
    filterGroup,
    findColumn,
    readColumn,
    toShownBound,
    toStoredBound,
} from '@/constants/screener';

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

describe('filter bounds', () => {
    it('shows a ratio as a percentage, with no binary noise from the scaling', () => {
        expect(toShownBound('change-today', 0.07)).toBe(7);
    });

    it('stores a typed percentage of a ratio as the fraction the API compares', () => {
        expect(toStoredBound('change-today', 5)).toBe(0.05);
    });

    it('leaves every other bound as typed', () => {
        expect(toShownBound('gap-percent', 2.5)).toBe(2.5);
        expect(toStoredBound('market-cap', 1_000)).toBe(1_000);
    });
});

describe('COLUMNS', () => {
    it('offers exactly the paths some filter names — anything else renders empty', () => {
        expect(COLUMNS).toHaveLength(RANGE_FILTERS.length + ENUM_FILTERS.length + MA_FILTERS.length);
    });

    // The nightly run stores these as fractions: 0.0062 for a 0.62% day
    it.each([
        'todaychange',
        'ytdchange',
        'DividendYield',
        'EPSQoQ',
        'quarterlyFinancials.0.grossMargin',
        'percoff52WeekHigh',
    ])('reads %s as a fraction to show as a percentage', (path) => {
        expect(findColumn(path)?.format).toBe('ratio');
    });

    it.each(['Gap', 'ADV1M'])('reads %s as a percentage already, rather than scaling it a second time', (path) => {
        expect(findColumn(path)?.format).toBe('percent');
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

    it('can render every column a result page carries by default', () => {
        for (const path of toResultColumns([])) expect(COLUMNS.some((column) => column.path === path)).toBe(true);
    });
});

describe('readColumn', () => {
    it('reads a column the row carries, by its path', () => {
        expect(readColumn(screenerResult('AAPL', { columns: { 'TimeSeries.close': 180 } }), 'TimeSeries.close')).toBe(
            180,
        );
        expect(
            readColumn(
                screenerResult('AAPL', { columns: { 'quarterlyFinancials.0.roe': 0.2 } }),
                'quarterlyFinancials.0.roe',
            ),
        ).toBe(0.2);
    });

    it('answers null for a column the row does not carry, or one the registry never heard of', () => {
        expect(readColumn(screenerResult('AAPL'), 'TimeSeries.close')).toBeNull();
        expect(readColumn(screenerResult('AAPL'), 'MadeUpField')).toBeNull();
    });

    it('keeps a legitimate zero', () => {
        expect(readColumn(screenerResult('AAPL', { columns: { PERatio: 0 } }), 'PERatio')).toBe(0);
    });
});
