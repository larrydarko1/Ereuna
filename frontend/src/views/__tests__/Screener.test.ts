import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { DEFAULT_COLUMNS } from '@/constants/screener';
import Screener from '@/views/Screener.vue';

vi.mock('@/api/socket', async () => (await import('@/__tests__/support/socket')).socketModule());

/**
 * The price chart is stubbed: it drives the vendored canvas library, which has
 * no layout to draw into under jsdom. This view owns the list and the wiring
 * around it; PriceChart has its own suite.
 */
const PriceChartStub = { name: 'PriceChart', props: ['symbol', 'profile'], template: '<div class="stub-chart" />' };

const api = mockApi();

const screener = (name: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: name,
    name,
    include: true,
    filterCount: 1,
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...over,
});

const page = (symbols: string[], pages = 1): Record<string, unknown> => ({
    items: symbols.map((symbol) => ({
        symbol,
        name: `${symbol} Inc`,
        assetType: 'Stock',
        sector: 'Tech',
        exchange: 'NASDAQ',
    })),
    total: symbols.length,
    page: 1,
    pages,
});

const preferences = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    language: 'en',
    theme: null,
    defaultSymbol: 'AAPL',
    hiddenSymbols: [],
    chartSettings: null,
    panels: null,
    screenerColumns: [],
    ...over,
});

const view = async (): Promise<VueWrapper> => {
    const wrapper = mount(Screener, {
        global: { stubs: { PriceChart: PriceChartStub } },
        attachTo: document.body,
    });
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

const action = (wrapper: VueWrapper, label: string): HTMLElement => {
    const node = wrapper.findAll('.toolbar__action').find((button) => button.text() === label);
    if (node === undefined) throw new Error(`no action labelled ${label}`);
    return node.element as HTMLElement;
};

const mode = (wrapper: VueWrapper, index: number): HTMLElement =>
    wrapper.findAll('.toolbar__mode')[index]?.element as HTMLElement;

beforeEach(() => {
    clearAuth();
    localStorage.clear();
    document.body.innerHTML = '';
    api.on('GET /api/preferences', preferences());
    api.on('PATCH /api/preferences', preferences());
    api.on('GET /api/screeners', { items: [screener('Growth'), screener('Value')] });
    api.on('GET /api/screeners/filters', {
        items: [{ key: 'market-cap', label: 'Market cap', kind: 'range', available: true, bounds: null }],
    });
    api.on('GET /api/screeners/Growth', { ...screener('Growth'), filters: {} });
    api.on('GET /api/screeners/Value', { ...screener('Value'), filters: {} });
    api.on('GET /api/screeners/Growth/results', page(['AAPL', 'MSFT']));
    api.on('GET /api/screeners/Value/results', page(['NVDA']));
    api.on('GET /api/screeners/results', page(['AAPL', 'MSFT', 'NVDA']));
    api.on('GET /api/charts/AAPL/profile', { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ' });
    api.on('GET /api/charts/MSFT/profile', { symbol: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ' });
    api.on('GET /api/charts/NVDA/profile', { symbol: 'NVDA', name: 'Nvidia', exchange: 'NASDAQ' });
});

describe('Screener', () => {
    it('reads the screeners, the filter catalogue and the preferences on arrival', async () => {
        await view();

        const paths = api.calls.map((call) => call.path);
        expect(paths).toContain('/api/screeners');
        expect(paths).toContain('/api/screeners/filters');
        expect(paths).toContain('/api/preferences');
    });

    it('lists the matches of the screener that is open', async () => {
        const wrapper = await view();

        expect(wrapper.findAll('.results-table__row')).toHaveLength(2);
        expect(wrapper.get('.toolbar__count').text()).toBe(i18n.global.t('screener.resultsCount', { count: 2 }));
    });

    it('puts the first match on the chart, so the pane is never empty', async () => {
        const wrapper = await view();

        expect(wrapper.get('.results-table__row').classes()).toContain('results-table__row--selected');
        expect(wrapper.find('.stub-chart').exists()).toBe(true);
    });

    it('follows the row that was clicked', async () => {
        const wrapper = await view();

        await wrapper.findAll('.results-table__row')[1]?.trigger('click');

        expect(wrapper.findAll('.results-table__row')[1]?.classes()).toContain('results-table__row--selected');
    });

    it('shows the default columns until the account has chosen its own', async () => {
        const wrapper = await view();

        expect(wrapper.findAll('.results-table__th--figure')).toHaveLength(DEFAULT_COLUMNS.length);
    });

    it('ignores a stored column the catalogue no longer knows', async () => {
        api.on('GET /api/preferences', preferences({ screenerColumns: ['MadeUpField'] }));

        const wrapper = await view();

        expect(wrapper.findAll('.results-table__th--figure')).toHaveLength(DEFAULT_COLUMNS.length);
    });

    it('switches to the combined results, which come from their own route', async () => {
        const wrapper = await view();

        await click(mode(wrapper, 1));

        expect(api.calls.some((call) => call.path === '/api/screeners/results')).toBe(true);
        expect(wrapper.findAll('.results-table__row')).toHaveLength(3);
    });

    it('lists the hidden symbols from the preference itself, with no screener query behind it', async () => {
        api.on('GET /api/preferences', preferences({ hiddenSymbols: ['TSLA'] }));
        api.on('GET /api/charts/TSLA/profile', { symbol: 'TSLA', name: 'Tesla', exchange: 'NASDAQ' });
        const wrapper = await view();
        const before = api.calls.length;

        await click(mode(wrapper, 2));

        expect(wrapper.findAll('.results-table__row')).toHaveLength(1);
        // The chart still follows the selection, and the results composable keeps
        // its own key warm; what the hidden list must not do is ask for matches
        expect(api.calls.slice(before).filter((call) => call.path.endsWith('/results'))).toHaveLength(0);
    });

    it('says the list is empty rather than drawing an empty table', async () => {
        api.on('GET /api/screeners/Growth/results', page([]));

        const wrapper = await view();

        expect(wrapper.get('.empty-state__title').text()).toBe(i18n.global.t('screener.noResults'));
    });

    it('says so differently when it is the hidden list that is empty', async () => {
        const wrapper = await view();

        await click(mode(wrapper, 2));

        expect(wrapper.get('.empty-state__title').text()).toBe(i18n.global.t('screener.noHidden'));
    });

    it('applies a filter, then reloads both the matches and the screener counts', async () => {
        api.on('PUT /api/screeners/Growth/filters/market-cap', { filters: { 'market-cap': { min: 1 } } });
        const wrapper = await view();
        const before = api.calls.length;

        await wrapper.get('.range-filter input').setValue('1000');
        await wrapper.get('.range-filter').trigger('submit');
        await flushPromises();

        const after = api.calls.slice(before).map((call) => call.path);
        expect(after).toContain('/api/screeners/Growth/filters/market-cap');
        expect(after).toContain('/api/screeners');
        expect(after).toContain('/api/screeners/Growth/results');
    });

    it('hides a symbol and refreshes the copy every panel reads', async () => {
        api.on('POST /api/preferences/hidden/AAPL', { hiddenSymbols: ['AAPL'] });
        const wrapper = await view();

        await click(wrapper.get('.results-table__action').element as HTMLElement);

        expect(api.calls.some((call) => call.path === '/api/preferences/hidden/AAPL')).toBe(true);
    });

    it('says so when hiding a symbol fails', async () => {
        api.on('POST /api/preferences/hidden/AAPL', { error: 'INTERNAL' }, { status: 500 });
        const wrapper = await view();

        await click(wrapper.get('.results-table__action').element as HTMLElement);

        expect(wrapper.get('.screener__error[role="alert"]').text()).toBe(i18n.global.t('screener.hideFailed'));
    });

    it('saves the chosen columns', async () => {
        const wrapper = await view();

        await click(action(wrapper, i18n.global.t('screener.columnsTitle')));
        await click($('.columns-dialog__button--primary'));

        expect(api.calls.find((call) => call.method === 'PATCH')?.body).toHaveProperty('screenerColumns');
        wrapper.unmount();
    });

    it('creates a screener from the prompt', async () => {
        api.on('POST /api/screeners', screener('New'));
        api.on('GET /api/screeners/New', { ...screener('New'), filters: {} });
        api.on('GET /api/screeners/New/results', page([]));
        const wrapper = await view();

        await click(wrapper.findAll('.picker__button')[0]?.element as HTMLElement);
        const input = $('.prompt input') as HTMLInputElement;
        input.value = 'New';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await click($('.prompt__submit'));

        expect(api.calls.find((call) => call.method === 'POST')?.body).toEqual({ name: 'New' });
        wrapper.unmount();
    });

    it('keeps the prompt open when a name is refused', async () => {
        api.on('POST /api/screeners', { error: 'SCREENER_NAME_TAKEN' }, { status: 409 });
        const wrapper = await view();

        await click(wrapper.findAll('.picker__button')[0]?.element as HTMLElement);
        const input = $('.prompt input') as HTMLInputElement;
        input.value = 'Growth';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await click($('.prompt__submit'));

        expect(document.body.querySelector('.prompt')).not.toBeNull();
        wrapper.unmount();
    });

    it('deletes a screener behind a confirmation', async () => {
        api.on('DELETE /api/screeners/Growth', null, { status: 204 });
        const wrapper = await view();

        await click(wrapper.findAll('.picker__button')[3]?.element as HTMLElement);
        await click($('.dialog__footer .screener__action:last-child'));

        expect(api.calls.some((call) => call.method === 'DELETE')).toBe(true);
        wrapper.unmount();
    });

    it('exports the matches as CSV, walking the pages up to the cap', async () => {
        const anchor = document.createElement('a');
        const clicked = vi.spyOn(anchor, 'click').mockImplementation(() => {});
        vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
            tag === 'a' ? anchor : document.createElementNS('http://www.w3.org/1999/xhtml', tag),
        );
        URL.createObjectURL = vi.fn(() => 'blob:csv');
        URL.revokeObjectURL = vi.fn();
        const wrapper = await view();

        await click(action(wrapper, i18n.global.t('common.download')));

        expect(clicked).toHaveBeenCalled();
        expect(anchor.download).toBe('Growth.csv');
        vi.restoreAllMocks();
    });

    it('exports the hidden list straight from the preference', async () => {
        api.on('GET /api/preferences', preferences({ hiddenSymbols: ['TSLA'] }));
        const anchor = document.createElement('a');
        vi.spyOn(anchor, 'click').mockImplementation(() => {});
        vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
            tag === 'a' ? anchor : document.createElementNS('http://www.w3.org/1999/xhtml', tag),
        );
        URL.createObjectURL = vi.fn(() => 'blob:csv');
        URL.revokeObjectURL = vi.fn();
        const wrapper = await view();
        await click(mode(wrapper, 2));
        const before = api.calls.length;

        await click(action(wrapper, i18n.global.t('common.download')));

        expect(anchor.download).toBe('hidden.csv');
        expect(api.calls).toHaveLength(before);
        vi.restoreAllMocks();
    });

    it('says so when an export fails', async () => {
        api.on('GET /api/screeners/Growth/results', page(['AAPL']));
        const wrapper = await view();
        api.on('GET /api/screeners/Growth/results', { error: 'INTERNAL' }, { status: 500 });

        await click(action(wrapper, i18n.global.t('common.download')));

        expect(wrapper.get('.screener__error[role="alert"]').text()).toBe(i18n.global.t('screener.exportFailed'));
    });

    it('walks the selection down the list while autoplay is on, and stops at the end', async () => {
        vi.useFakeTimers();
        const wrapper = await view();

        await click(action(wrapper, i18n.global.t('screener.autoplay')));
        await vi.advanceTimersByTimeAsync(4000);

        expect(wrapper.findAll('.results-table__row')[1]?.classes()).toContain('results-table__row--selected');

        await vi.advanceTimersByTimeAsync(4000);
        expect(action(wrapper, i18n.global.t('screener.autoplay')).getAttribute('aria-pressed')).toBe('false');
        vi.useRealTimers();
    });

    it('stops the autoplay timer once the view is gone', async () => {
        vi.useFakeTimers();
        const cleared = vi.spyOn(globalThis, 'clearInterval');
        const wrapper = await view();
        await click(action(wrapper, i18n.global.t('screener.autoplay')));

        wrapper.unmount();

        expect(cleared).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('opens on the results pane, and swaps to the others', async () => {
        const wrapper = await view();

        expect(wrapper.findAll('.screener__tab')[1]?.attributes('aria-pressed')).toBe('true');

        await wrapper.findAll('.screener__tab')[0]?.trigger('click');

        expect(wrapper.get('.screener__column--filters').classes()).not.toContain('screener__column--hidden');
    });

    it('reports a failed results read in place of the table', async () => {
        api.on('GET /api/screeners/Growth/results', { error: 'INTERNAL' }, { status: 500 });

        const wrapper = await view();

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
    });
});
