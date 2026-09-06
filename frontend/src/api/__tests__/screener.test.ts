import { describe, expect, it } from 'vitest';
import { mockApi } from '@/__tests__/support/msw';
import {
    clearAllFilters,
    clearFilter,
    createScreener,
    deleteScreener,
    getCombinedResults,
    getFilterRegistry,
    getScreener,
    getScreenerResults,
    getScreeners,
    setFilter,
    updateScreener,
} from '@/api/screener';

const mock = mockApi();
const filters = { filters: {} };
const page = { items: [], total: 0, page: 1, pages: 0 };

describe('the collection', () => {
    it('lists the screeners', async () => {
        mock.on('GET /api/screeners', { items: [] });

        await expect(getScreeners()).resolves.toMatchObject({ data: { items: [] } });
    });

    it('creates one by name', async () => {
        mock.on('POST /api/screeners', { name: 'Value' });

        await createScreener('Value');

        expect(mock.last().body).toEqual({ name: 'Value' });
    });

    it('reads the registry the panels are built from, rather than hardcoding it', async () => {
        mock.on('GET /api/screeners/filters', { items: [{ key: 'price', kind: 'range', available: true }] });

        const { data } = await getFilterRegistry();

        expect(data.items[0]).toMatchObject({ key: 'price', kind: 'range' });
    });
});

describe('results', () => {
    it('reads the combined results with no paging by default', async () => {
        mock.on('GET /api/screeners/results', page);

        await getCombinedResults();

        expect(mock.last().search.toString()).toBe('');
    });

    it('pages the combined results', async () => {
        mock.on('GET /api/screeners/results', page);

        await getCombinedResults({ page: 2, limit: 25 });

        expect(Object.fromEntries(mock.last().search)).toEqual({ page: '2', limit: '25' });
    });

    it("reads one screener's results", async () => {
        mock.on('GET /api/screeners/Value/results', page);

        await getScreenerResults('Value', { page: 3 });

        expect(mock.last().path).toBe('/api/screeners/Value/results');
        expect(mock.last().search.get('page')).toBe('3');
    });
});

describe('one screener', () => {
    it('reads it with its filters', async () => {
        mock.on('GET /api/screeners/Value', { name: 'Value', filters: {} });

        await getScreener('Value');

        expect(mock.last().path).toBe('/api/screeners/Value');
    });

    it('patches only what changed', async () => {
        mock.on('PATCH /api/screeners/Value', { name: 'Value', include: false });

        await updateScreener('Value', { include: false });

        expect(mock.last().body).toEqual({ include: false });
    });

    it('deletes it', async () => {
        mock.on('DELETE /api/screeners/Value', null, { status: 204 });

        await deleteScreener('Value');

        expect(mock.last().method).toBe('DELETE');
    });
});

describe('filters', () => {
    it.each([
        ['a range', 'price', { min: 1, max: 10 }],
        ['a date range', 'ipo-date', { from: '2020-01-01', to: '2026-01-01' }],
        ['an option list', 'sectors', { values: ['Technology'] }],
        ['a moving-average relation', 'ma-50', { direction: 'abv', target: 'price' }],
        ['a flag', 'new-high', { enabled: true }],
    ])("writes %s as the body the descriptor's kind calls for", async (_case, key, value) => {
        mock.on(`PUT /api/screeners/Value/filters/${key}`, filters);

        await setFilter('Value', key, value);

        expect(mock.last().body).toEqual(value);
    });

    it('encodes both the screener name and the filter key', async () => {
        mock.on('PUT /api/screeners/:name/filters/:filter', filters);

        await setFilter('My screener', 'a/b', { enabled: true });

        expect(mock.last().path).toBe('/api/screeners/My%20screener/filters/a%2Fb');
    });

    it('clears one', async () => {
        mock.on('DELETE /api/screeners/Value/filters/price', filters);

        await clearFilter('Value', 'price');

        expect(mock.last().path).toBe('/api/screeners/Value/filters/price');
    });

    it('clears every one', async () => {
        mock.on('DELETE /api/screeners/Value/filters', filters);

        await clearAllFilters('Value');

        expect(mock.last().path).toBe('/api/screeners/Value/filters');
    });
});
