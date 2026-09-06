import { describe, expect, it, vi } from 'vitest';
import { effectScope, ref, type Ref } from 'vue';
import { mockApi } from '@/__tests__/support/msw';
import { useScreenerFilters, type UseScreenerFiltersReturn } from '@/composables/screener/useScreenerFilters';

const mock = mockApi();

const detail = (filters: Record<string, unknown>): Record<string, unknown> => ({
    id: 'Value',
    name: 'Value',
    include: false,
    filterCount: Object.keys(filters).length,
    updatedAt: '2026-03-02T00:00:00.000Z',
    filters,
});

function inScope(name: Ref<string>): { filters: UseScreenerFiltersReturn; stop: () => void } {
    const scope = effectScope();
    const filters = scope.run(() => useScreenerFilters(name)) as UseScreenerFiltersReturn;
    return { filters, stop: () => scope.stop() };
}

describe('reading the filters', () => {
    it('reads the screener the caller names', async () => {
        mock.on('GET /api/screeners/Value', detail({ PE: [5, 20] }));
        const { filters } = inScope(ref('Value'));

        await vi.waitFor(() => expect(filters.activeCount.value).toBe(1));
        expect(filters.pending.value).toBe(false);
    });

    it('reads nothing when no screener is selected', async () => {
        const { filters } = inScope(ref(''));

        await vi.waitFor(() => expect(filters.filters.value).toEqual({}));
        expect(mock.calls).toHaveLength(0);
    });

    it('swaps the filters when the screener changes', async () => {
        const name = ref('Value');
        mock.on('GET /api/screeners/Value', detail({ PE: [5, 20] }));
        mock.on('GET /api/screeners/Growth', detail({}));
        const { filters } = inScope(name);
        await vi.waitFor(() => expect(filters.activeCount.value).toBe(1));

        name.value = 'Growth';

        await vi.waitFor(() => expect(filters.activeCount.value).toBe(0));
    });

    it('reports a failure and holds nothing', async () => {
        mock.on('GET /api/screeners/Value', { error: 'SCREENER_NOT_FOUND' }, { status: 404 });
        const { filters } = inScope(ref('Value'));

        await vi.waitFor(() => expect(filters.error.value).not.toBeNull());
        expect(filters.filters.value).toEqual({});
    });
});

describe('valueFor', () => {
    const load = async (stored: Record<string, unknown>): Promise<UseScreenerFiltersReturn> => {
        mock.on('GET /api/screeners/Value', detail(stored));
        const { filters } = inScope(ref('Value'));
        await vi.waitFor(() => expect(filters.pending.value).toBe(false));
        return filters;
    };

    it('reads a stored range through the registry, not by assuming slug equals field', async () => {
        const filters = await load({ PE: [5, 20] });

        expect(filters.valueFor('pe', 'range')).toEqual({ kind: 'range', min: 5, max: 20 });
    });

    it('reads a date range', async () => {
        const filters = await load({ IPO: ['2020-01-01', '2026-01-01'] });

        expect(filters.valueFor('ipo-date', 'date')).toEqual({
            kind: 'date',
            from: '2020-01-01',
            to: '2026-01-01',
        });
    });

    it('reads an option list', async () => {
        const filters = await load({ Sectors: ['Technology', 'Energy'] });

        expect(filters.valueFor('sectors', 'enum')).toEqual({ kind: 'enum', values: ['Technology', 'Energy'] });
    });

    it('splits the stored moving-average shorthand back into its two parts', async () => {
        const filters = await load({ MA50: 'abv200' });

        expect(filters.valueFor('ma-50', 'ma')).toEqual({ kind: 'ma', direction: 'abv', target: '200' });
    });

    it('reads the price target whatever case it was stored in', async () => {
        const filters = await load({ MA50: 'blwPrice' });

        expect(filters.valueFor('ma-50', 'ma')).toEqual({ kind: 'ma', direction: 'blw', target: 'price' });
    });

    it('reads a flag only when it is on', async () => {
        const filters = await load({ NewHigh: true });

        expect(filters.valueFor('new-high', 'flag')).toEqual({ kind: 'flag', enabled: true });
        expect(filters.valueFor('new-low', 'flag')).toBeNull();
    });

    it('answers null for a filter that is not written', async () => {
        const filters = await load({});

        expect(filters.valueFor('pe', 'range')).toBeNull();
    });

    it('answers null for a filter the registry does not know', async () => {
        const filters = await load({});

        expect(filters.valueFor('made-up', 'range')).toBeNull();
    });

    it('refuses to read a date range as a numeric one, and the reverse', async () => {
        const filters = await load({ PE: [5, 20], IPO: ['2020-01-01', '2026-01-01'] });

        expect(filters.valueFor('pe', 'date')).toBeNull();
        expect(filters.valueFor('ipo-date', 'range')).toBeNull();
    });

    it('answers null for a moving-average value that is not the shorthand', async () => {
        const filters = await load({ MA50: 'sideways' });

        expect(filters.valueFor('ma-50', 'ma')).toBeNull();
    });
});

describe('writing', () => {
    it('keeps the filter set the server settled on, not the one that was typed', async () => {
        mock.on('GET /api/screeners/Value', detail({}));
        mock.on('PUT /api/screeners/Value/filters/pe', { filters: { PE: [5, 20] } });
        const { filters } = inScope(ref('Value'));
        await vi.waitFor(() => expect(filters.pending.value).toBe(false));

        await filters.set('pe', { min: 20, max: 5 });

        expect(filters.valueFor('pe', 'range')).toEqual({ kind: 'range', min: 5, max: 20 });
        expect(filters.saving.value).toBeNull();
    });

    it('clears one filter', async () => {
        mock.on('GET /api/screeners/Value', detail({ PE: [5, 20] }));
        mock.on('DELETE /api/screeners/Value/filters/pe', { filters: {} });
        const { filters } = inScope(ref('Value'));
        await vi.waitFor(() => expect(filters.activeCount.value).toBe(1));

        await filters.clear('pe');

        expect(filters.activeCount.value).toBe(0);
    });

    it('clears every filter', async () => {
        mock.on('GET /api/screeners/Value', detail({ PE: [5, 20], Sectors: ['Technology'] }));
        mock.on('DELETE /api/screeners/Value/filters', { filters: {} });
        const { filters } = inScope(ref('Value'));
        await vi.waitFor(() => expect(filters.activeCount.value).toBe(2));

        await filters.clearAll();

        expect(filters.activeCount.value).toBe(0);
    });

    it('reports a refused write without throwing at the panel', async () => {
        mock.on('GET /api/screeners/Value', detail({}));
        mock.on(
            'PUT /api/screeners/Value/filters/pe',
            { error: 'FILTER_RANGE_INVALID', params: { filter: 'pe' } },
            { status: 422 },
        );
        const { filters } = inScope(ref('Value'));
        await vi.waitFor(() => expect(filters.pending.value).toBe(false));

        await expect(filters.set('pe', { min: 1 })).resolves.toBeUndefined();

        expect(filters.error.value).not.toBeNull();
        expect(filters.saving.value).toBeNull();
    });

    it('writes nothing when no screener is selected', async () => {
        const { filters } = inScope(ref(''));

        await filters.set('pe', { min: 1 });

        expect(mock.calls).toHaveLength(0);
    });
});
