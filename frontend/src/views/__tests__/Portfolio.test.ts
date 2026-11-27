import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PortfolioSummary, TradeRow } from '@ereuna/shared';

import { portfolioRow } from '@/__tests__/support/answers';
import { elementOf, getElement, query } from '@/__tests__/support/dom';
import { mockApi } from '@/__tests__/support/msw';
import { summary as makeSummary } from '@/__tests__/support/portfolio';
import { socket } from '@/__tests__/support/socket';
import { objectId } from '@/__tests__/support/values';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { formatCurrency, toDateInput } from '@/utils/formatters';
import Portfolio from '@/views/Portfolio.vue';

vi.mock('@/api/socket', async () => (await import('@/__tests__/support/socket')).socketModule());

const api = mockApi();

const trade = (over: Partial<TradeRow> = {}): TradeRow => ({
    id: objectId(1),
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
    price: 110,
    live: false,
    marketValue: 1100,
    exposure: 1100,
    unrealizedPL: 100,
    unrealizedPLPercent: 10,
    weight: 50,
});

const seed = (over: Partial<PortfolioSummary> = {}, trades: TradeRow[] = [trade()]): void => {
    api.on('GET /api/portfolios', { items: [portfolioRow()] });
    api.on('GET /api/portfolios/0', makeSummary(over));
    api.on('GET /api/portfolios/0/trades', { items: trades, total: trades.length, page: 1, limit: 50 });
};

const view = async (): Promise<VueWrapper> => {
    const wrapper = mount(Portfolio, { attachTo: document.body });
    await flushPromises();
    await flushPromises();
    return wrapper;
};

const click = async (element: HTMLElement | undefined): Promise<void> => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
};

const toolbar = (wrapper: VueWrapper, index: number): HTMLElement =>
    elementOf(wrapper.findAll('.portfolio-tabs__actions .btn')[index]?.element, HTMLElement);

/** The monthly breakdown is behind a button named for what it loads. */
const monthlyButton = (wrapper: VueWrapper): HTMLElement => {
    const node = wrapper
        .findAll('.portfolio__panel .btn')
        .find((button) => button.text() === i18n.global.t('portfolio.monthlyPerformanceAnalysis'));
    if (node === undefined) throw new Error('no monthly breakdown button on the page');
    return elementOf(node.element, HTMLElement);
};

const cancel = async (): Promise<void> => {
    const button = [...document.body.querySelectorAll<HTMLElement>('.dialog__footer button')].find(
        (entry) => entry.textContent.trim() === i18n.global.t('common.cancel'),
    );
    await click(button);
};

const set = async (selector: string, value: string): Promise<void> => {
    const field = query(selector, HTMLInputElement);
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

beforeEach(() => {
    clearAuth();
    localStorage.clear();
    document.body.innerHTML = '';
    socket.reset();
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
        api.on('GET /api/portfolios/0/trades', { items: [], total: 0, page: 1, limit: 50 });

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
        api.on('GET /api/portfolios/2/trades', { items: [], total: 0, page: 1, limit: 50 });
        const wrapper = await view();

        await wrapper.findAll('.portfolio-tabs__slot')[2]?.trigger('click');
        await flushPromises();

        expect(api.calls.some((call) => call.path === '/api/portfolios/2/trades')).toBe(true);
    });

    it('records a trade and reloads the portfolio it changed', async () => {
        seed();
        api.on('POST /api/portfolios/0/trades', trade({ id: objectId(2) }));
        const wrapper = await view();

        await click(toolbar(wrapper, 0));
        await fillTrade('AAPL', '5', '200');
        await click(getElement('.dialog__footer .btn--primary'));

        expect(api.calls.find((call) => call.method === 'POST')?.body).toMatchObject({ symbol: 'AAPL', shares: 5 });
        expect(document.body.querySelector('.trade-dialog')).toBeNull();
        wrapper.unmount();
    });

    it('keeps a refused trade in its dialog, and forgets it once the dialog is cancelled', async () => {
        seed();
        api.on('POST /api/portfolios/0/trades', { error: 'INSUFFICIENT_BUYING_POWER' }, { status: 422 });
        const wrapper = await view();

        await click(toolbar(wrapper, 0));
        await fillTrade('AAPL', '5', '200');
        await click(getElement('.dialog__footer .btn--primary'));

        expect(getElement('.dialog [role="alert"]').textContent).toBe(
            i18n.global.t('errors.INSUFFICIENT_BUYING_POWER'),
        );

        await cancel();
        await click(toolbar(wrapper, 0));

        expect(document.body.querySelector('.dialog [role="alert"]')).toBeNull();
        wrapper.unmount();
    });

    it('opens the trade dialog on the row being corrected', async () => {
        seed();
        const wrapper = await view();

        await click(elementOf(wrapper.findAll('.trade-history__row-actions .btn')[0]?.element, HTMLElement));

        expect(field(i18n.global.t('portfolio.symbol')).value).toBe('AAPL');
        expect(getElement('.dialog__title').textContent).toBe(i18n.global.t('portfolio.editTrade'));
        wrapper.unmount();
    });

    it('corrects a cash movement in the cash dialog, which is the one that can write it', async () => {
        const deposit = trade({ action: 'deposit', symbol: null, shares: 0, price: 0, total: 2500 });
        seed({}, [deposit]);
        api.on(`PATCH /api/portfolios/0/trades/${objectId(1)}`, { ...deposit, total: 3000 });
        const wrapper = await view();

        await click(elementOf(wrapper.findAll('.trade-history__row-actions .btn')[0]?.element, HTMLElement));
        expect(query('.cash-dialog input[type="number"]', HTMLInputElement).value).toBe('2500');
        await set('.cash-dialog input[type="number"]', '3000');
        await click(getElement('.dialog__footer .btn--primary'));

        expect(api.calls.find((call) => call.method === 'PATCH')?.body).toEqual({
            action: 'deposit',
            total: 3000,
            tradeDate: '2026-02-01',
        });
        wrapper.unmount();
    });

    it('records a deposit as new after an edit was cancelled', async () => {
        seed();
        api.on('POST /api/portfolios/0/trades', trade({ id: objectId(3), action: 'deposit', symbol: null }));
        const wrapper = await view();

        await click(elementOf(wrapper.findAll('.trade-history__row-actions .btn')[0]?.element, HTMLElement));
        await click(getElement('.dialog__footer .btn:not(.btn--primary)'));
        await click(toolbar(wrapper, 1));
        await set('.cash-dialog input[type="number"]', '2500');
        await click(getElement('.dialog__footer .btn--primary'));

        expect(api.calls.map((call) => call.method)).not.toContain('PATCH');
        expect(api.calls.find((call) => call.method === 'POST')?.body).toMatchObject({ action: 'deposit' });
        wrapper.unmount();
    });

    it('asks before deleting a trade, and deletes it on confirmation', async () => {
        seed();
        api.on(`DELETE /api/portfolios/0/trades/${objectId(1)}`, null, { status: 204 });
        const wrapper = await view();

        await click(elementOf(wrapper.findAll('.trade-history__row-actions .btn')[1]?.element, HTMLElement));
        expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

        await click(getElement('.dialog__footer .btn--danger, .dialog__footer .btn--primary'));

        expect(api.calls.some((call) => call.method === 'DELETE')).toBe(true);
        wrapper.unmount();
    });

    it('closes a position as the opposite trade, pre-filled', async () => {
        seed({ positions: [position('AAPL')] });
        const wrapper = await view();

        await click(elementOf(wrapper.get('.positions-table .btn').element, HTMLElement));

        expect(field(i18n.global.t('portfolio.symbol')).value).toBe('AAPL');
        expect(query('input[value="sell"]', HTMLInputElement).checked).toBe(true);
        wrapper.unmount();
    });

    it('records a cash movement from its own dialog', async () => {
        seed();
        api.on('POST /api/portfolios/0/trades', trade({ id: objectId(3), action: 'deposit', symbol: null }));
        const wrapper = await view();

        await click(toolbar(wrapper, 1));
        await set('.cash-dialog input[type="number"]', '2500');
        await click(getElement('.dialog__footer .btn--primary'));

        expect(api.calls.find((call) => call.method === 'POST')?.body).toEqual({
            action: 'deposit',
            total: 2500,
            tradeDate: toDateInput(new Date()),
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

    it('shows a refused setting in its dialog only, not on the page behind it', async () => {
        seed();
        api.on('PUT /api/portfolios/0/leverage', { error: 'INSUFFICIENT_BUYING_POWER' }, { status: 422 });
        const wrapper = await view();

        await click(toolbar(wrapper, 2));
        await set('.settings-dialog__row:nth-child(2) input', '3');
        await click([...document.body.querySelectorAll<HTMLElement>('.settings-dialog__row button')][1]);

        expect(getElement('.dialog [role="alert"]').textContent).toBe(
            i18n.global.t('errors.INSUFFICIENT_BUYING_POWER'),
        );
        expect(wrapper.find('.portfolio__error').exists()).toBe(false);

        await cancel();

        expect(wrapper.find('.portfolio__error').exists()).toBe(false);
        wrapper.unmount();
    });

    it('edits the benchmarks from the strip', async () => {
        seed();
        api.on('PUT /api/portfolios/0/benchmarks', { benchmarks: ['SPY'] });
        const wrapper = await view();

        await click(elementOf(wrapper.get('.benchmark-strip .btn--small').element, HTMLElement));
        await click(getElement('.dialog__footer .btn--primary'));

        expect(api.calls.find((call) => call.method === 'PUT')?.path).toBe('/api/portfolios/0/benchmarks');
        wrapper.unmount();
    });

    it('resets the slot on confirmation', async () => {
        seed();
        api.on('DELETE /api/portfolios/0', null, { status: 204 });
        const wrapper = await view();

        await click(toolbar(wrapper, 5));
        await click(getElement('.dialog__footer .btn--danger, .dialog__footer .btn--primary'));

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
            trades: [
                {
                    action: 'buy',
                    symbol: 'AAPL',
                    shares: 10,
                    price: 100,
                    total: 1000,
                    commission: 1,
                    tradeDate: '2026-01-05',
                },
            ],
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
        expect(monthlyButton(wrapper).parentElement?.querySelector('[role="alert"]')?.textContent).toBe(
            i18n.global.t('errors.INTERNAL'),
        );
    });

    it('reports a failed read of the trades in the trade history panel', async () => {
        seed();
        api.on('GET /api/portfolios/0/trades', { error: 'INTERNAL' }, { status: 500 });

        const wrapper = await view();

        const panel = wrapper.findAll('.portfolio__panel').find((entry) => entry.find('.trade-history').exists());
        expect(panel?.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
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

describe('Portfolio live valuation', () => {
    beforeEach(() => {
        // Only the clock: flushPromises runs on the real setTimeout. 10:00 New York on a Friday
        vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
        vi.setSystemTime(new Date('2026-03-06T15:00:00Z'));
        api.on('GET /api/market/holidays', { holidays: [] });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('asks the server to price the open slot while the session trades', async () => {
        seed({ positions: [position('AAPL')] });

        await view();

        expect(socket.emitted).toContainEqual({ event: 'portfolio:watch', payload: { number: 0 } });
    });

    it('shows the valuation the server pushed over the summary it read', async () => {
        seed({ positions: [position('AAPL')] });
        const wrapper = await view();

        socket.deliver('portfolio:update', {
            number: 0,
            positions: [{ ...position('AAPL'), price: 130, live: true }],
            longValue: 1_300,
            shortValue: 0,
            grossExposure: 1_300,
            netExposure: 1_300,
            totalValue: 123_456,
            leverageUsed: 0.01,
            buyingPower: 245_612,
            unrealizedPL: 300,
            totalPL: 23_456,
            totalPLPercent: 23.46,
        });
        await flushPromises();

        expect(wrapper.get('.summary-cards').text()).toContain(formatCurrency(123_456));
        expect(wrapper.get('.positions-table__live').text()).toBe(formatCurrency(130));
    });
});
