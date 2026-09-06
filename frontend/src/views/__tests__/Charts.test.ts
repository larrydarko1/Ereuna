import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { Router } from 'vue-router';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { testRouter } from '@/__tests__/support/router';
import Charts from '@/views/Charts.vue';

/**
 * The price chart is stubbed: it drives the vendored canvas library, which has
 * no layout to draw into under jsdom. What this view owns is the wiring around
 * it — the symbol, the reads, the panes — and PriceChart has its own suite.
 */
const PriceChartStub = {
    name: 'PriceChart',
    props: ['symbol', 'profile', 'events'],
    template: '<div class="stub-chart" />',
};

vi.mock('@/api/socket', async () => (await import('@/__tests__/support/socket')).socketModule());

const api = mockApi();

const PROFILE = { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ' };

const view = async (path = '/charts/aapl'): Promise<{ wrapper: VueWrapper; router: Router }> => {
    const router = testRouter();
    await router.push(path);
    await router.isReady();
    const wrapper = mount(Charts, {
        global: { plugins: [router], stubs: { PriceChart: PriceChartStub } },
        attachTo: document.body,
    });
    await flushPromises();
    await flushPromises();
    return { wrapper, router };
};

beforeEach(() => {
    clearAuth();
    localStorage.clear();
    document.body.innerHTML = '';
    api.on('GET /api/preferences', {
        language: 'en',
        theme: null,
        defaultSymbol: 'AAPL',
        hiddenSymbols: [],
        chartSettings: null,
        panels: null,
        screenerColumns: [],
    });
    api.on('GET /api/charts/AAPL/profile', PROFILE);
    api.on('GET /api/charts/MSFT/profile', { symbol: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ' });
    api.on('GET /api/charts/AAPL/events', { earnings: [], dividends: [], splits: [] });
    api.on('GET /api/charts/MSFT/events', { earnings: [], dividends: [], splits: [] });
    api.on('GET /api/charts/AAPL/series', { symbol: 'AAPL', timeframe: 'daily', candles: [] });
    api.on('GET /api/charts/MSFT/series', { symbol: 'MSFT', timeframe: 'daily', candles: [] });
    api.on('GET /api/charts/AAPL/signals', { signals: [] });
    api.on('GET /api/charts/MSFT/signals', { signals: [] });
    api.on('GET /api/charts/AAPL/drawings', { drawings: [] });
    api.on('GET /api/market/AAPL/financials', { symbol: 'AAPL', annual: [], quarterly: [] });
    api.on('GET /api/market/MSFT/financials', { symbol: 'MSFT', annual: [], quarterly: [] });
    api.on('GET /api/notes', { items: [], total: 0, page: 1, pages: 1 });
    api.on('GET /api/market/news', { items: [] });
    api.on('GET /api/market/status', { status: 'closed', holiday: null });
    api.on('GET /api/watchlists', { items: [] });
});

describe('Charts', () => {
    it('reads the profile and the actions for the symbol in the URL', async () => {
        await view();

        const paths = api.calls.map((call) => call.path);
        expect(paths).toContain('/api/charts/AAPL/profile');
        expect(paths).toContain('/api/charts/AAPL/events');
    });

    it('reads the corporate actions once for the chart and the sidebar together', async () => {
        await view();

        expect(api.calls.filter((call) => call.path === '/api/charts/AAPL/events')).toHaveLength(1);
    });

    it('titles the page with the company name, falling back to the ticker', async () => {
        const { wrapper } = await view();

        expect(wrapper.get('.charts__symbol').text()).toBe('AAPL');
        expect(wrapper.get('.charts__name').text()).toBe('Apple Inc');
    });

    it('falls back to the ticker when the profile names nothing', async () => {
        api.on('GET /api/charts/AAPL/profile', { symbol: 'AAPL', name: null, exchange: null });

        const { wrapper } = await view();

        expect(wrapper.get('.charts__name').text()).toBe('AAPL');
    });

    it('opens on the chart pane, and swaps to the others', async () => {
        const { wrapper } = await view();

        expect(wrapper.findAll('.charts__tab')[1]?.attributes('aria-pressed')).toBe('true');

        await wrapper.findAll('.charts__tab')[0]?.trigger('click');

        expect(wrapper.get('.charts__column--info').classes()).not.toContain('charts__column--hidden');
        expect(wrapper.get('.charts__column--chart').classes()).toContain('charts__column--hidden');
    });

    it('rewrites a bare /charts to the account default, so the page can be linked to', async () => {
        const { router } = await view('/charts');

        expect(router.currentRoute.value.params.symbol).toBe('AAPL');
    });

    it('follows the symbol the search picked', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [{ symbol: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ' }] });
        const { wrapper, router } = await view();

        await wrapper.get('.symbol-search__input').setValue('msft');
        await vi.advanceTimersByTimeAsync(250);
        await flushPromises();
        await wrapper.get('[role="option"]').trigger('mousedown');
        await flushPromises();

        expect(router.currentRoute.value.params.symbol).toBe('MSFT');
        vi.useRealTimers();
    });

    it('reports a failed profile read without losing the chart', async () => {
        api.on('GET /api/charts/AAPL/profile', { error: 'INTERNAL' }, { status: 500 });

        const { wrapper } = await view();

        expect(wrapper.get('.charts__error').text()).toBe(i18n.global.t('errors.INTERNAL'));
        expect(wrapper.find('.stub-chart').exists()).toBe(true);
    });

    it('opens the layout editor on demand', async () => {
        const { wrapper } = await view();

        await wrapper.get('.charts__edit').trigger('click');
        await flushPromises();

        expect(document.body.querySelector('.panel-layout__tabs')).not.toBeNull();
        wrapper.unmount();
    });
});
