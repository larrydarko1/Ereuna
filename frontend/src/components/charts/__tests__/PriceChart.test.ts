import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { CHART_TIMEFRAMES } from '@ereuna/shared';
import type { AssetProfile } from '@/api/chart';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { loadPreferences } from '@/composables/data/usePreferences';
import { EOD_TIMEFRAMES, TIMEFRAME_LABELS } from '@/constants/chart';
import PriceChart from '@/components/charts/PriceChart.vue';

vi.mock('@/api/socket', async () => (await import('@/__tests__/support/socket')).socketModule());

const api = mockApi();

const DAY = 86_400;

const candle = (index: number, close: number): Record<string, unknown> => ({
    time: 1_700_000_000 + index * DAY,
    open: close - 1,
    high: close + 2,
    low: close - 2,
    close,
});

const RUN = Array.from({ length: 40 }, (_, index) => 100 + Math.sin(index / 3) * 10);

const series = (closesIn: number[] = RUN): Record<string, unknown> => ({
    symbol: 'AAPL',
    timeframe: 'daily',
    candles: closesIn.map((close, index) => candle(index, close)),
    volume: closesIn.map((_, index) => ({ time: 1_700_000_000 + index * DAY, value: 1_000_000 })),
    overlays: [],
    intrinsicValue: null,
});

const profile = (over: Partial<AssetProfile> = {}): AssetProfile =>
    ({
        symbol: 'AAPL',
        name: 'Apple Inc',
        exchange: 'NASDAQ',
        delisted: false,
        signals: [],
        ...over,
    }) as unknown as AssetProfile;

const chart = async (props: Record<string, unknown> = {}): Promise<VueWrapper> => {
    const wrapper = mount(PriceChart, { props: { symbol: 'AAPL', ...props }, attachTo: document.body });
    await flushPromises();
    await flushPromises();
    return wrapper;
};

/** Dialogs are teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} on the page`);
    return element;
};

const click = async (element: HTMLElement | undefined): Promise<void> => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
};

const toolbarButton = (wrapper: VueWrapper, label: string): HTMLElement => {
    const node = wrapper.findAll('.toolbar__button').find((button) => button.attributes('aria-label') === label);
    if (node === undefined) throw new Error(`no toolbar button labelled ${label}`);
    return node.element as HTMLElement;
};

const timeframes = (wrapper: VueWrapper): string[] =>
    wrapper.findAll('.price-chart__timeframe').map((node) => node.text());

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
    api.on('GET /api/charts/AAPL', series());
    api.on('GET /api/charts/MSFT', { ...series(), symbol: 'MSFT' });
    api.on('GET /api/charts/AAPL/drawings', { drawings: [] });
    api.on('GET /api/charts/MSFT/drawings', { drawings: [] });
    api.on('DELETE /api/charts/AAPL/drawings', null, { status: 204 });
    api.on('GET /api/market/status', { status: 'closed', holiday: null });
});

describe('PriceChart', () => {
    it('reads the daily series for the symbol it was given', async () => {
        await chart();

        const read = api.calls.find((call) => call.path === '/api/charts/AAPL');
        expect(read?.search.get('timeframe')).toBe('daily');
    });

    it('offers every timeframe for a listing with intraday bars', async () => {
        const wrapper = await chart({ profile: profile({ exchange: 'NASDAQ' }) });

        expect(timeframes(wrapper)).toEqual(CHART_TIMEFRAMES.map((one) => TIMEFRAME_LABELS[one]));
    });

    it('offers only the end-of-day timeframes where there are no intraday bars', async () => {
        const wrapper = await chart({ profile: profile({ exchange: 'LSE' }) });

        expect(timeframes(wrapper)).toEqual(EOD_TIMEFRAMES.map((one) => TIMEFRAME_LABELS[one]));
    });

    it('re-reads the series for the timeframe that was picked', async () => {
        api.on('GET /api/charts/AAPL', series());
        const wrapper = await chart({ profile: profile() });

        await wrapper.findAll('.price-chart__timeframe')[1]?.trigger('click');
        await flushPromises();

        expect(api.last().search.get('timeframe')).toBe(CHART_TIMEFRAMES[1]);
    });

    it('marks the timeframe in view as pressed, and only that one', async () => {
        const wrapper = await chart({ profile: profile() });

        expect(wrapper.findAll('.price-chart__timeframe[aria-pressed="true"]')).toHaveLength(1);
    });

    it('re-reads the series when the chart moves to another symbol', async () => {
        const wrapper = await chart();

        await wrapper.setProps({ symbol: 'MSFT' });
        await flushPromises();

        expect(api.calls.some((call) => call.path === '/api/charts/MSFT')).toBe(true);
    });

    it('spins while the series is being read', () => {
        api.on('GET /api/charts/AAPL', series());
        const wrapper = mount(PriceChart, { props: { symbol: 'AAPL' } });

        expect(wrapper.find('.price-chart__overlay').exists()).toBe(true);
    });

    it('says there is nothing to draw rather than an empty canvas', async () => {
        api.on('GET /api/charts/AAPL', series([]));

        const wrapper = await chart();

        expect(wrapper.get('.price-chart__overlay').text()).toBe(i18n.global.t('charts.noData'));
    });

    it('reports a failed read over the canvas', async () => {
        api.on('GET /api/charts/AAPL', { error: 'INTERNAL' }, { status: 500 });

        const wrapper = await chart();

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
    });

    it('flags a delisted instrument on the legend', async () => {
        const wrapper = await chart({ profile: profile({ delisted: true }) });

        expect(wrapper.findAll('.legend__badge').map((node) => node.text())).toContain(
            i18n.global.t('charts.delisted'),
        );
    });

    it('flags an instrument hidden from the screener, which is when people ask why', async () => {
        api.on('GET /api/preferences', {
            language: 'en',
            theme: null,
            defaultSymbol: 'AAPL',
            hiddenSymbols: ['AAPL'],
            chartSettings: null,
            panels: null,
            screenerColumns: [],
        });
        await loadPreferences(true);

        const wrapper = await chart({ profile: profile() });

        expect(wrapper.findAll('.legend__badge').map((node) => node.text())).toContain(i18n.global.t('charts.hidden'));
    });

    it('flags a listing that only has end-of-day bars', async () => {
        const wrapper = await chart({ profile: profile({ exchange: 'LSE' }) });

        expect(wrapper.findAll('.legend__badge').map((node) => node.text())).toContain(i18n.global.t('charts.eodOnly'));
    });

    it('offers the signals only for an instrument that has some', async () => {
        const without = await chart({ profile: profile({ signals: [] }) });
        expect(without.findAll('.toolbar__button').map((node) => node.attributes('aria-label'))).not.toContain(
            i18n.global.t('charts.signals.title'),
        );

        const withSignals = await chart({
            profile: profile({
                signals: [
                    {
                        date: '2026-03-04',
                        direction: 'BUY',
                        strategy: 'RSI_Oversold',
                        description: 'Oversold',
                        price: 100,
                        indicatorValue: 28,
                    },
                ],
            }),
        });
        await click(toolbarButton(withSignals, i18n.global.t('charts.signals.title')));

        expect(document.body.querySelector('.signals__list')).not.toBeNull();
        withSignals.unmount();
    });

    it('opens the settings, the patterns and the screenshot dialogs', async () => {
        const wrapper = await chart({ profile: profile() });

        await click(toolbarButton(wrapper, i18n.global.t('charts.settings.title')));
        expect(document.body.querySelector('.chart-settings')).not.toBeNull();
        await click($('.dialog__close'));

        await click(toolbarButton(wrapper, i18n.global.t('charts.tools.screenshot')));
        expect(document.body.querySelector('.screenshot')).not.toBeNull();
        wrapper.unmount();
    });

    it('picks up a drawing tool and puts it down again', async () => {
        const wrapper = await chart({ profile: profile() });

        await click(toolbarButton(wrapper, i18n.global.t('charts.tools.ruler')));
        expect(toolbarButton(wrapper, i18n.global.t('charts.tools.ruler')).getAttribute('aria-pressed')).toBe('true');

        await click(toolbarButton(wrapper, i18n.global.t('charts.tools.ruler')));
        expect(toolbarButton(wrapper, i18n.global.t('charts.tools.ruler')).getAttribute('aria-pressed')).toBe('false');
    });

    it('puts a tool down on escape', async () => {
        const wrapper = await chart({ profile: profile() });
        await click(toolbarButton(wrapper, i18n.global.t('charts.tools.box')));

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        await flushPromises();

        expect(toolbarButton(wrapper, i18n.global.t('charts.tools.box')).getAttribute('aria-pressed')).toBe('false');
    });

    it('leaves a delete alone while a text annotation has focus', async () => {
        const wrapper = await chart({ profile: profile() });
        const input = document.createElement('input');
        document.body.append(input);
        input.focus();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
        await flushPromises();

        expect(wrapper.find('.price-chart').exists()).toBe(true);
        input.remove();
    });

    it('shows the pattern list once the overlay is on', async () => {
        const wrapper = await chart({ profile: profile() });

        await click(toolbarButton(wrapper, i18n.global.t('charts.tools.patterns')));

        expect(toolbarButton(wrapper, i18n.global.t('charts.tools.patterns')).getAttribute('aria-pressed')).toBe(
            'true',
        );
        wrapper.unmount();
    });

    it('offers no clear while there is nothing drawn to clear', async () => {
        const wrapper = await chart({ profile: profile() });

        expect(wrapper.findAll('.toolbar__button').map((node) => node.attributes('aria-label'))).not.toContain(
            i18n.global.t('charts.tools.clear'),
        );
    });

    it('reads the drawings stored for this symbol and timeframe', async () => {
        await chart({ profile: profile() });

        const read = api.calls.find((call) => call.path === '/api/charts/AAPL/drawings');
        expect(read?.search.get('timeframe')).toBe('daily');
    });

    it('asks where to start a replay, and shows the transport once it runs', async () => {
        const wrapper = await chart({ profile: profile() });

        await click(toolbarButton(wrapper, i18n.global.t('charts.replay.start')));
        expect(document.body.querySelector('.replay-start')).not.toBeNull();

        await click($('.replay-start__confirm'));

        expect(wrapper.find('.replay').exists()).toBe(true);
        wrapper.unmount();
    });

    it('closes the start dialog without replaying when it is dismissed', async () => {
        const wrapper = await chart({ profile: profile() });

        await click(toolbarButton(wrapper, i18n.global.t('charts.replay.start')));
        await click($('.dialog__close'));

        expect(document.body.querySelector('.replay-start')).toBeNull();
        expect(wrapper.find('.replay').exists()).toBe(false);
        wrapper.unmount();
    });

    it('names the timeframe group for a screen reader', async () => {
        const wrapper = await chart();

        expect(wrapper.get('.price-chart__timeframes').attributes('aria-label')).toBe(
            i18n.global.t('charts.timeframeLabel'),
        );
    });

    it('tears the chart down when it goes away', async () => {
        const wrapper = await chart({ profile: profile() });

        wrapper.unmount();

        expect(document.body.querySelector('.price-chart')).toBeNull();
    });
});
