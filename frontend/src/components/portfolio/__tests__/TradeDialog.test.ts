import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { TradeRow } from '@/api/trades';
import { i18n } from '@/i18n';
import { formatCurrency, formatNumber, toDateInput } from '@/utils/formatters';
import TradeDialog from '@/components/portfolio/TradeDialog.vue';

const open = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(TradeDialog, { props, attachTo: document.body });

/** The dialog is teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
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

const type = async (label: string, value: string): Promise<void> => {
    const input = field(label);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
};

const save = async (): Promise<void> => {
    $('.dialog__footer .btn--primary').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
};

const fill = async (symbol: string, shares: string, price: string): Promise<void> => {
    await type(i18n.global.t('portfolio.symbol'), symbol);
    await type(i18n.global.t('portfolio.shares'), shares);
    await type(i18n.global.t('portfolio.price'), price);
};

const TRADE: TradeRow = {
    id: 't1',
    symbol: 'AAPL',
    action: 'sell',
    shares: 10,
    price: 190,
    total: 1900,
    commission: 1,
    tradeDate: '2026-02-01',
    createdAt: '2026-02-01T00:00:00.000Z',
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('TradeDialog', () => {
    it('offers the four equity actions, cash being recorded elsewhere', () => {
        open();

        expect(document.body.querySelectorAll('input[name="trade-action"]')).toHaveLength(4);
    });

    it('opens blank on a buy dated today', () => {
        open();

        expect(($('input[value="buy"]') as HTMLInputElement).checked).toBe(true);
        expect(field(i18n.global.t('portfolio.date')).value).toBe(toDateInput(new Date()));
        expect($('.dialog__title').textContent).toBe(i18n.global.t('portfolio.newTrade'));
    });

    it('opens on the trade being corrected', () => {
        open({ editing: TRADE });

        expect($('.dialog__title').textContent).toBe(i18n.global.t('portfolio.editTrade'));
        expect(($('input[value="sell"]') as HTMLInputElement).checked).toBe(true);
        expect(field(i18n.global.t('portfolio.symbol')).value).toBe('AAPL');
        expect(field(i18n.global.t('portfolio.shares')).value).toBe('10');
        expect(field(i18n.global.t('portfolio.date')).value).toBe('2026-02-01');
    });

    it('opens on the position being closed', () => {
        open({ preset: { action: 'sell', symbol: 'MSFT', shares: 25 } });

        expect(field(i18n.global.t('portfolio.symbol')).value).toBe('MSFT');
        expect(field(i18n.global.t('portfolio.shares')).value).toBe('25');
    });

    it('totals the trade as it is typed', async () => {
        open();

        await fill('aapl', '10', '190.5');

        expect($('.form-output').textContent).toBe(formatCurrency(1905));
    });

    it('reads a half-typed number as nothing rather than as an error', async () => {
        open();

        await type(i18n.global.t('portfolio.shares'), '-');

        expect($('.form-output').textContent).toBe(formatCurrency(0));
    });

    it('will not save without a symbol, shares and a price', async () => {
        const wrapper = open();

        await fill('aapl', '10', '');
        await save();

        expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('submits the symbol upper-cased and the numbers parsed', async () => {
        const wrapper = open();

        await fill(' aapl ', '10', '190');
        await type(i18n.global.t('portfolio.date'), '2026-03-04');
        await save();

        expect(wrapper.emitted('submit')?.[0]).toEqual([
            { action: 'buy', symbol: 'AAPL', shares: 10, price: 190, total: 1900, tradeDate: '2026-03-04' },
        ]);
    });

    it('omits the commission rather than sending zero, which would mean free', async () => {
        const wrapper = open({ defaultCommission: 4.95 });

        await fill('aapl', '10', '190');
        await save();

        expect(wrapper.emitted('submit')?.[0]?.[0]).not.toHaveProperty('commission');
        expect(field(i18n.global.t('portfolio.commission')).placeholder).toBe(formatNumber(4.95, 2));
    });

    it('sends the commission that was typed', async () => {
        const wrapper = open();

        await fill('aapl', '10', '190');
        await type(i18n.global.t('portfolio.commission'), '2.5');
        await save();

        expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ commission: 2.5 });
    });

    it('sends the commission a correction already carried', async () => {
        const wrapper = open({ editing: TRADE });

        await save();

        expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ commission: 1 });
    });

    it('sends nothing more while a save is in flight', async () => {
        const wrapper = open({ saving: true });

        await fill('aapl', '10', '190');
        await save();

        expect(wrapper.emitted('submit')).toBeUndefined();
        expect($('.dialog__footer .btn--primary').textContent?.trim()).toBe(i18n.global.t('common.saving'));
    });

    it('shows what the last save was refused for', () => {
        open({ error: 'Not enough shares' });

        expect($('.form-error[role="alert"]').textContent).toBe('Not enough shares');
    });

    it('closes on cancel', async () => {
        const wrapper = open();

        $('.dialog__footer .btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
