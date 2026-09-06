import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { TradeSignal } from '@/api/chart';
import { i18n } from '@/i18n';
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters';
import SignalsDialog from '@/components/charts/SignalsDialog.vue';

const signal = (over: Partial<TradeSignal> = {}): TradeSignal => ({
    date: '2026-03-04',
    direction: 'BUY',
    strategy: 'RSI_Oversold',
    description: 'RSI crossed back above 30',
    price: 190.5,
    indicatorValue: 28.4,
    ...over,
});

const open = (signals: TradeSignal[]): VueWrapper =>
    mount(SignalsDialog, { props: { symbol: 'AAPL', signals }, attachTo: document.body });

const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const all = (selector: string): HTMLElement[] => [...document.body.querySelectorAll<HTMLElement>(selector)];

afterEach(() => {
    document.body.innerHTML = '';
});

describe('SignalsDialog', () => {
    it('names the instrument the signals belong to', () => {
        open([signal()]);

        expect($('.signals__subject').textContent).toBe('AAPL');
    });

    it('says there are none rather than showing an empty list', () => {
        open([]);

        expect($('.signals__empty').textContent).toBe(i18n.global.t('charts.signals.none'));
    });

    it('shows one entry per signal', () => {
        expect(open([signal(), signal({ direction: 'SELL' })]).exists()).toBe(true);
        expect(all('.signals__item')).toHaveLength(2);
    });

    it('reads a signal out: side, strategy, price, reason and date', () => {
        open([signal()]);

        expect($('.signals__direction').textContent?.trim()).toBe(i18n.global.t('charts.signals.buy'));
        expect($('.signals__price').textContent?.trim()).toBe(formatCurrency(190.5));
        expect($('.signals__description').textContent).toBe('RSI crossed back above 30');
        expect($('.signals__meta').textContent).toContain(formatDate('2026-03-04'));
    });

    it('colours a buy and a sell apart', () => {
        open([signal({ direction: 'SELL' })]);

        expect($('.signals__direction').classList.contains('signals__direction--sell')).toBe(true);
    });

    it('translates a strategy it knows', () => {
        open([signal({ strategy: 'RSI_Oversold' })]);
        const shown = $('.signals__strategy').textContent?.trim();

        expect(shown).toBe(i18n.global.t('charts.signals.strategies.RSI_Oversold'));
    });

    it('spaces out a strategy the locale has never heard of, rather than printing a key', () => {
        open([signal({ strategy: 'Brand_New_Detector' })]);

        expect($('.signals__strategy').textContent?.trim()).toBe('Brand New Detector');
    });

    it('leaves out a price the aggregator did not attach', () => {
        open([signal({ price: null })]);

        expect(document.body.querySelector('.signals__price')).toBeNull();
    });

    it('shows the indicator reading when there is one', () => {
        open([signal({ indicatorValue: 28.4 })]);
        expect($('.signals__meta').textContent).toContain(formatNumber(28.4));

        document.body.innerHTML = '';
        open([signal({ indicatorValue: null })]);
        expect($('.signals__meta').querySelectorAll('span')).toHaveLength(1);
    });

    it('closes on the dialog close', async () => {
        const wrapper = open([signal()]);

        $('.dialog__close').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
