import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { mockApi } from '@/__tests__/support/msw';
import {
    useScreenerResults,
    type ResultsSource,
    type UseScreenerResultsReturn,
} from '@/composables/screener/useScreenerResults';

const mock = mockApi();

const page = (symbols: string[], total = symbols.length, pages = 1): Record<string, unknown> => ({
    items: symbols.map((symbol) => ({ symbol, name: symbol, assetType: null, sector: null, exchange: null })),
    total,
    page: 1,
    pages,
});

function inScope(
    source: () => ResultsSource,
    revision: () => number = () => 0,
): { results: UseScreenerResultsReturn; stop: () => void } {
    const scope = effectScope();
    const results = scope.run(() => useScreenerResults(source, revision)) as UseScreenerResultsReturn;
    return { results, stop: () => scope.stop() };
}

describe('reading a page', () => {
    it("reads the named screener's matches", async () => {
        mock.on('GET /api/screeners/Value/results', page(['AAPL', 'MSFT'], 2, 1));
        const { results } = inScope(() => ({ kind: 'screener', name: 'Value' }));

        await vi.waitFor(() => expect(results.items.value).toHaveLength(2));
        expect(results.total.value).toBe(2);
        expect(results.pages.value).toBe(1);
        expect(results.pending.value).toBe(false);
        expect(mock.last().search.get('limit')).toBe('100');
    });

    it('reads every included screener when asked for the combined set', async () => {
        mock.on('GET /api/screeners/results', page(['AAPL']));
        const { results } = inScope(() => ({ kind: 'combined' }));

        await vi.waitFor(() => expect(results.items.value).toHaveLength(1));
        expect(mock.last().path).toBe('/api/screeners/results');
    });

    it('reads nothing when no screener is selected', async () => {
        const { results } = inScope(() => ({ kind: 'screener', name: '' }));

        await nextTick();

        expect(mock.calls).toHaveLength(0);
        expect(results.items.value).toEqual([]);
        expect(results.total.value).toBe(0);
    });

    it('reports a failure and holds nothing', async () => {
        mock.on('GET /api/screeners/Value/results', { error: 'INTERNAL' }, { status: 500 });
        const { results } = inScope(() => ({ kind: 'screener', name: 'Value' }));

        await vi.waitFor(() => expect(results.error.value).not.toBeNull());
        expect(results.items.value).toEqual([]);
        expect(results.pages.value).toBe(0);
    });

    it('reports empty only once the read has finished', async () => {
        mock.on('GET /api/screeners/Value/results', page([], 0, 0));
        const { results } = inScope(() => ({ kind: 'screener', name: 'Value' }));

        await vi.waitFor(() => expect(results.pending.value).toBe(false));

        expect(results.isEmpty.value).toBe(true);
    });
});

describe('paging', () => {
    it('reads the page asked for', async () => {
        mock.on('GET /api/screeners/Value/results', page(['AAPL'], 300, 3));
        const { results } = inScope(() => ({ kind: 'screener', name: 'Value' }));
        await vi.waitFor(() => expect(results.pages.value).toBe(3));

        results.goTo(2);
        await vi.waitFor(() => expect(mock.last().search.get('page')).toBe('2'));

        expect(results.page.value).toBe(2);
    });

    it('clamps to the pages that exist', async () => {
        mock.on('GET /api/screeners/Value/results', page(['AAPL'], 300, 3));
        const { results } = inScope(() => ({ kind: 'screener', name: 'Value' }));
        await vi.waitFor(() => expect(results.pages.value).toBe(3));

        results.goTo(99);
        await nextTick();
        expect(results.page.value).toBe(3);

        results.goTo(0);
        await nextTick();
        expect(results.page.value).toBe(1);
    });

    it('starts again from page one when the screener changes', async () => {
        const name = ref('Value');
        mock.on('GET /api/screeners/Value/results', page(['AAPL'], 300, 3));
        mock.on('GET /api/screeners/Growth/results', page(['MSFT'], 10, 1));
        const { results } = inScope(() => ({ kind: 'screener', name: name.value }));
        await vi.waitFor(() => expect(results.pages.value).toBe(3));
        results.goTo(3);
        await vi.waitFor(() => expect(results.page.value).toBe(3));

        name.value = 'Growth';

        await vi.waitFor(() => expect(results.items.value).toEqual([expect.objectContaining({ symbol: 'MSFT' })]));
        expect(results.page.value).toBe(1);
    });

    it('starts again from page one when the filters change', async () => {
        const revision = ref(0);
        mock.on('GET /api/screeners/Value/results', page(['AAPL'], 300, 3));
        const { results } = inScope(
            () => ({ kind: 'screener', name: 'Value' }),
            () => revision.value,
        );
        await vi.waitFor(() => expect(results.pages.value).toBe(3));
        results.goTo(3);
        await vi.waitFor(() => expect(results.page.value).toBe(3));

        revision.value += 1;

        await vi.waitFor(() => expect(results.page.value).toBe(1));
    });

    it('re-reads on demand without moving the page', async () => {
        mock.on('GET /api/screeners/Value/results', page(['AAPL'], 300, 3));
        const { results } = inScope(() => ({ kind: 'screener', name: 'Value' }));
        await vi.waitFor(() => expect(results.pages.value).toBe(3));
        const before = mock.calls.length;

        await results.reload();

        expect(mock.calls.length).toBe(before + 1);
        expect(results.page.value).toBe(1);
    });
});
