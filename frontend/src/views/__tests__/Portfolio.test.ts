import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { PortfolioSummary } from '@/api/portfolio';
import type { TradeRow } from '@/api/trades';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { summary as makeSummary } from '@/__tests__/support/portfolio';
import Portfolio from '@/views/Portfolio.vue';

vi.mock('@/api/socket', async () => (await import('@/__tests__/support/socket')).socketModule());

const api = mockApi();

const trade = (over: Partial<TradeRow> = {}): TradeRow => ({
    id: 't1',
    symbol: 'AAPL',
    action: 'buy',
    shares: 10,
    price: 190,
    total: 1900,
    commission: 1,
    tradeDate: '2026-02-01',
    createdAt: '2026-02-01T00:00:00.000Z',
    ...over,
});

const position = (symbol: string): PortfolioSummary['positions'][number] => ({
    symbol,
    side: 'long',
    shares: 10,
    avgPrice: 100,
    lastClose: 110,
    marketValue: 1100,
    exposure: 1100,
    unrealizedPL: 100,
    unrealizedPLPercent: 10,
    weight: 50,
});

const seed = (over: Partial<PortfolioSummary> = {}, trades: TradeRow[] = [trade()]): void => {
    api.on('GET /api/portfolios', { items: [{ number: 0, cash: 10_000 }] });
    api.on('GET /api/portfolios/0', makeSummary(over));
    api.on('GET /api/portfolios/0/trades', { items: trades, total: trades.length, page: 1, pages: 1 });
};

const view = async (): Promise<VueWrapper> => {
    const wrapper = mount(Portfolio, { attachTo: document.body });
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

const toolbar = (wrapper: VueWrapper, index: number): HTMLElement =>
    wrapper.findAll('.portfolio-tabs__actions .btn')[index]?.element as HTMLElement;

/** The monthly breakdown is behind a button named for what it loads. */
const monthlyButton = (wrapper: VueWrapper): HTMLElement => {
    const node = wrapper
        .findAll('.portfolio__panel .btn')
        .find((button) => button.text() === i18n.global.t('portfolio.monthlyPerformanceAnalysis'));
    if (node === undefined) throw new Error('no monthly breakdown button on the page');
    return node.element as HTMLElement;
};

beforeEach(() => {
    clearAuth();
    localStorage.clear();
    document.body.innerHTML = '';
    api.on('GET /api/market/status', { status: 'closed', holiday: null });
});

describe('Portfolio', () => {
    it('reads the slots, the open one and its trades on arrival', async () => {
        seed();

        await view();

        const paths = api.calls.map((call) => call.path);
        expect(paths).toContain('/api/portfolios');
        expect(paths).toContain('/api/portfolios/0');
        expect(paths).toContain('/api/portfolios/0/trades');
    });

    it('offers a way in when the slot is empty', async () => {
        api.on('GET /api/portfolios', { items: [] });
        api.on('GET /api/portfolios/0', { error: 'PORTFOLIO_NOT_FOUND' }, { status: 404 });
        api.on('GET /api/portfolios/0/trades', { items: [], total: 0, page: 1, pages: 1 });

        const wrapper = await view();

        expect(wrapper.get('.empty-state__title').text()).toBe(i18n.global.t('portfolio.emptySlot'));
        expect(wrapper.findAll('.empty-state__actions .btn')).toHaveLength(2);
    });

    it('fills every panel from the one summary', async () => {
        seed({ positions: [position('AAPL')], valueHistory: [{ date: '2026-01-31', value: 100_000 }] });

        const wrapper = await view();

        expect(wrapper.find('.summary-cards').exists()).toBe(true);
        expect(wrapper.find('.positions-table').exists()).toBe(true);
        expect(wrapper.find('.trade-history').exists()).toBe(true);
        expect(wrapper.find('.benchmark-strip').exists()).toBe(true);
    });

    it('says so rather than drawing a chart of nothing', async () => {
        seed();

        const wrapper = await view();

        expect(wrapper.findAll('.form-hint').length).toBeGreaterThan(0);
    });

    it('shows the performance grid only once there are closed trades to describe', async () => {
        seed();
        expect((await view()).find('.stats-grid').exists()).toBe(false);
    });

    it('switches slot, dropping the blotter that belonged to the last one', async () => {
        seed();
        api.on('GET /api/portfolios/2', makeSummary({ number: 2 }));
        api.on('GET /api/portfolios/2/trades', { items: [], total: 0, page: 1, pages: 1 });
        const wrapper = await view();

        await wrapper.findAll('.portfolio-tabs__slot')[2]?.trigger('click');
        await flushPromises();

        expect(api.calls.some((call) => call.path === '/api/portfolios/2/trades')).toBe(true);
    });

    it('records a trade and reloads the portfolio it changed', async () => {
        seed();
        api.on('POST /api/portfolios/0/trades', trade({ id: 't2' }));
        const wrapper = await view();

        await click(toolbar(wrapper, 0));
        await fillTrade('AAPL', '5', '200');
        await click($('.dialog__footer .btn--primary'));

        expect(api.calls.find((call) => call.method === 'POST')?.body).toMatchObject({ symbol: 'AAPL', shares: 5 });
        expect(document.body.querySelector('.trade-dialog')).toBeNull();
        wrapper.unmount();
    });

    it('opens the trade dialog on the row being corrected', async () => {
        seed();
        const wrapper = await view();

        await click(wrapper.findAll('.trade-history__row-actions .btn')[0]?.element as HTMLElement);

        expect(field(i18n.global.t('portfolio.symbol')).value).toBe('AAPL');
        expect($('.dialog__title').textContent).toBe(i18n.global.t('portfolio.editTrade'));
        wrapper.unmount();
    });

    it('asks before deleting a trade, and deletes it on confirmation', async () => {
        seed();
        api.on('DELETE /api/portfolios/0/trades/t1', null, { status: 204 });
        const wrapper = await view();

        await click(wrapper.findAll('.trade-history__row-actions .btn')[1]?.element as HTMLElement);
        expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

        await click($('.dialog__footer .btn--danger, .dialog__footer .btn--primary'));

        expect(api.calls.some((call) => call.method === 'DELETE')).toBe(true);
        wrapper.unmount();
    });

    it('closes a position as the opposite trade, pre-filled', async () => {
        seed({ positions: [position('AAPL')] });
        const wrapper = await view();

        await click(wrapper.get('.positions-table .btn').element as HTMLElement);

        expect(field(i18n.global.t('portfolio.symbol')).value).toBe('AAPL');
        expect(($('input[value="sell"]') as HTMLInputElement).checked).toBe(true);
        wrapper.unmount();
    });

    it('records a cash movement from its own dialog', async () => {
        seed();
        api.on('POST /api/portfolios/0/trades', trade({ id: 'cash', action: 'deposit', symbol: null }));
        const wrapper = await view();

        await click(toolbar(wrapper, 1));
        await set('.cash-dialog input[type="number"]', '2500');
        await click($('.dialog__footer .btn--primary'));

        expect(api.calls.find((call) => call.method === 'POST')?.body).toMatchObject({
            action: 'deposit',
            symbol: null,
            total: 2500,
        });
        wrapper.unmount();
    });

    it('saves a setting on its own', async () => {
        seed();
        api.on('PUT /api/portfolios/0/leverage', { leverage: 3 });
        const wrapper = await view();

        await click(toolbar(wrapper, 2));
        await set('.settings-dialog__row:nth-child(2) input', '3');
        await click([...document.body.querySelectorAll<HTMLElement>('.settings-dialog__row button')][1]);

        expect(api.calls.find((call) => call.method === 'PUT')?.body).toEqual({ leverage: 3 });
        wrapper.unmount();
    });

    it('edits the benchmarks from the strip', async () => {
        seed();
        api.on('PUT /api/portfolios/0/benchmarks', { benchmarks: ['SPY'] });
        const wrapper = await view();

        await click(wrapper.get('.benchmark-strip .btn--small').element as HTMLElement);
        await click($('.dialog__footer .btn--primary'));

        expect(api.calls.find((call) => call.method === 'PUT')?.path).toBe('/api/portfolios/0/benchmarks');
        wrapper.unmount();
    });

    it('resets the slot on confirmation', async () => {
        seed();
        api.on('DELETE /api/portfolios/0', null, { status: 204 });
        const wrapper = await view();

        await click(toolbar(wrapper, 5));
        await click($('.dialog__footer .btn--danger, .dialog__footer .btn--primary'));

        expect(api.calls.some((call) => call.method === 'DELETE')).toBe(true);
        wrapper.unmount();
    });

    it('loads the whole log on demand for the monthly breakdown', async () => {
        seed({ valueHistory: [{ date: '2026-01-31', value: 100_000 }] });
        api.on('GET /api/portfolios/0/export', {
            portfolio: {
                baseValue: 100_000,
                leverage: 2,
                defaultCommission: 1,
                benchmarks: [],
                stats: null,
                valueHistory: [],
            },
            trades: [trade()],
        });
        const wrapper = await view();

        expect(wrapper.find('.monthly-panel').exists()).toBe(false);
        await click(monthlyButton(wrapper));

        expect(wrapper.find('.monthly-panel').exists()).toBe(true);
    });

    it('offers the breakdown again when the log could not be read', async () => {
        seed({ valueHistory: [{ date: '2026-01-31', value: 100_000 }] });
        api.on('GET /api/portfolios/0/export', { error: 'INTERNAL' }, { status: 500 });
        const wrapper = await view();

        await click(monthlyButton(wrapper));

        expect(wrapper.find('.monthly-panel').exists()).toBe(false);
    });

    it('reports a failed read without hiding the tabs', async () => {
        api.on('GET /api/portfolios', { error: 'INTERNAL' }, { status: 500 });
        api.on('GET /api/portfolios/0', { error: 'INTERNAL' }, { status: 500 });
        api.on('GET /api/portfolios/0/trades', { error: 'INTERNAL' }, { status: 500 });

        const wrapper = await view();

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
        expect(wrapper.find('.portfolio-tabs').exists()).toBe(true);
    });
});

const set = async (selector: string, value: string): Promise<void> => {
    const field = $(selector) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
};

/** Fields are a mix of plain labels and AppField, so both markups are searched. */
const field = (label: string): HTMLInputElement => {
    const node = [...document.body.querySelectorAll('.form-field, .field')].find(
        (entry) => entry.querySelector('.form-label, .field__label')?.textContent === label,
    );
    const input = node?.querySelector('input');
    if (input === null || input === undefined) throw new Error(`no field named ${label}`);
    return input;
};

const fillTrade = async (symbol: string, shares: string, price: string): Promise<void> => {
    for (const [name, value] of [
        [i18n.global.t('portfolio.symbol'), symbol],
        [i18n.global.t('portfolio.shares'), shares],
        [i18n.global.t('portfolio.price'), price],
    ] as const) {
        const input = field(name);
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await flushPromises();
};
