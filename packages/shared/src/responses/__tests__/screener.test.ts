import { describe, expect, it } from 'vitest';

import { DEFAULT_SCREENER_COLUMNS, SCREENER_COLUMNS, toResultColumns } from '#responses/screener.js';

describe('toResultColumns', () => {
    it('gives an account that chose nothing the defaults', () => {
        expect(toResultColumns([])).toEqual(DEFAULT_SCREENER_COLUMNS);
    });

    it('keeps the columns the account chose, in its order, dropping any the registry no longer knows', () => {
        expect(toResultColumns(['PERatio', 'Retired', 'TimeSeries.close'])).toEqual(['PERatio', 'TimeSeries.close']);
    });

    it('falls back to the defaults when nothing the account chose is still known', () => {
        expect(toResultColumns(['Retired'])).toEqual(DEFAULT_SCREENER_COLUMNS);
    });

    it('defaults only to columns the API can project', () => {
        for (const column of DEFAULT_SCREENER_COLUMNS) expect(SCREENER_COLUMNS).toContain(column);
    });
});
