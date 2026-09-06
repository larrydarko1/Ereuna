import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import { mockApi } from '@/__tests__/support/msw';
import { clearAuth } from '@/api/client';
import { loadPreferences } from '@/composables/data/usePreferences';
import { useChartSymbol, type UseChartSymbolReturn } from '@/composables/charts/useChartSymbol';

const mock = mockApi();

const preferences = (defaultSymbol: string): Record<string, unknown> => ({
    language: 'en',
    theme: null,
    defaultSymbol,
    hiddenSymbols: [],
    chartSettings: null,
    panels: null,
    screenerColumns: [],
});

/** A two-route router, so `useChartSymbol` has a real `:symbol` param to read. */
function makeRouter(): Router {
    const blank = { template: '<div />' };
    return createRouter({
        history: createWebHistory(),
        routes: [
            { path: '/charts/:symbol?', name: 'Charts', component: blank },
            { path: '/', name: 'Home', component: blank },
        ],
    });
}

async function mountAt(path: string): Promise<{ chart: UseChartSymbolReturn; router: Router }> {
    const router = makeRouter();
    await router.push(path);
    await router.isReady();

    let chart!: UseChartSymbolReturn;
    mount(
        defineComponent({
            setup() {
                chart = useChartSymbol();
                return () => null;
            },
        }),
        { global: { plugins: [router] } },
    );

    return { chart, router };
}

beforeEach(() => {
    clearAuth();
});

describe('the symbol on screen', () => {
    it('comes from the URL', async () => {
        const { chart } = await mountAt('/charts/aapl');

        expect(chart.symbol.value).toBe('AAPL');
    });

    it('falls back to the account default for a bare /charts', async () => {
        mock.on('GET /api/preferences', preferences('MSFT'));
        await loadPreferences();
        const { chart } = await mountAt('/charts');

        expect(chart.symbol.value).toBe('MSFT');
    });

    it('is empty when there is neither', async () => {
        const { chart } = await mountAt('/charts');

        expect(chart.symbol.value).toBe('');
    });
});

describe('select', () => {
    it('puts the symbol in the URL, so the chart can be linked to', async () => {
        mock.on('PATCH /api/preferences', preferences('MSFT'));
        const { chart, router } = await mountAt('/charts/AAPL');

        await chart.select('msft');

        expect(router.currentRoute.value.fullPath).toBe('/charts/MSFT');
        // The account write is fire-and-forget; awaiting it here keeps it out
        // of the next test's recorded calls.
        await vi.waitFor(() => expect(mock.calls).toHaveLength(1));
    });

    it('remembers it as the account default, in the background', async () => {
        mock.on('PATCH /api/preferences', preferences('MSFT'));
        const { chart } = await mountAt('/charts/AAPL');

        await chart.select('MSFT');

        await vi.waitFor(() => expect(mock.last().body).toEqual({ defaultSymbol: 'MSFT' }));
    });

    it('does nothing for the symbol already shown', async () => {
        const { chart } = await mountAt('/charts/AAPL');

        await chart.select('aapl');

        expect(mock.calls).toHaveLength(0);
    });

    it('does nothing for an empty term', async () => {
        const { chart, router } = await mountAt('/charts/AAPL');

        await chart.select('   ');

        expect(router.currentRoute.value.fullPath).toBe('/charts/AAPL');
    });

    it('still moves the chart when the account write fails', async () => {
        mock.on('PATCH /api/preferences', { error: 'INTERNAL' }, { status: 500 });
        const { chart, router } = await mountAt('/charts/AAPL');

        await chart.select('MSFT');

        expect(router.currentRoute.value.fullPath).toBe('/charts/MSFT');
        await vi.waitFor(() => expect(mock.calls).toHaveLength(1));
    });
});

describe('canonicalize', () => {
    it('puts the resolved default in the URL without a history entry', async () => {
        mock.on('GET /api/preferences', preferences('MSFT'));
        await loadPreferences();
        const { chart, router } = await mountAt('/charts');
        const depth = window.history.length;

        await chart.canonicalize();

        expect(router.currentRoute.value.fullPath).toBe('/charts/MSFT');
        expect(window.history.length).toBe(depth);
    });

    it('leaves a URL that already names a symbol alone', async () => {
        const { chart, router } = await mountAt('/charts/AAPL');

        await chart.canonicalize();

        expect(router.currentRoute.value.fullPath).toBe('/charts/AAPL');
    });

    it('does nothing when there is no symbol to canonicalise to', async () => {
        const { chart, router } = await mountAt('/charts');

        await chart.canonicalize();

        expect(router.currentRoute.value.fullPath).toBe('/charts');
    });
});
