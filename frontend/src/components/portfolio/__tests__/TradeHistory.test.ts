import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { TradeRow } from '@/api/trades';
import { i18n } from '@/i18n';
import { formatCurrency, formatDate } from '@/utils/formatters';
import TradeHistory from '@/components/portfolio/TradeHistory.vue';

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

const history = (trades: TradeRow[], props: Record<string, unknown> = {}): VueWrapper =>
    mount(TradeHistory, { props: { trades, total: trades.length, page: 1, pageCount: 1, ...props } });

const cells = (wrapper: VueWrapper): string[] => wrapper.findAll('tbody td').map((node) => node.text());

describe('TradeHistory', () => {
    it('counts the whole log, not just the page on screen', () => {
        expect(history([trade()], { total: 240 }).get('.trade-history__count').text()).toBe('240');
    });

    it('shows one row per trade', () => {
        expect(history([trade(), trade({ id: 't2' })]).findAll('tbody tr')).toHaveLength(2);
    });

    it('says the log is empty rather than showing an empty table', () => {
        expect(history([]).get('.trade-history__empty').text()).toBe(i18n.global.t('portfolio.noTransactionHistory'));
    });

    it('reads a trade out in the order the columns are headed', () => {
        expect(cells(history([trade()])).slice(0, 7)).toEqual([
            formatDate('2026-02-01'),
            i18n.global.t('portfolio.actions.buy'),
            'AAPL',
            '10',
            formatCurrency(190),
            formatCurrency(1),
            formatCurrency(1900),
        ]);
    });

    it('dashes the fields a cash movement has none of', () => {
        const cash = trade({ symbol: null, action: 'deposit', shares: 0, price: 0, total: 2500 });

        expect(cells(history([cash])).slice(2, 5)).toEqual(['—', '—', '—']);
    });

    it('colours each action by what it is', () => {
        expect(
            history([trade({ action: 'short' })])
                .get('.trade-history__action')
                .classes(),
        ).toContain('trade-history__action--short');
    });

    it('asks to edit and delete the trade the row belongs to', async () => {
        const row = trade();
        const wrapper = history([row]);

        await wrapper.findAll('.trade-history__row-actions .btn')[0]?.trigger('click');
        await wrapper.findAll('.trade-history__row-actions .btn')[1]?.trigger('click');

        expect(wrapper.emitted('edit')?.[0]).toEqual([row]);
        expect(wrapper.emitted('delete')?.[0]).toEqual([row]);
    });

    it('offers no pager for a log that fits on one page', () => {
        expect(history([trade()]).find('.trade-history__pager').exists()).toBe(false);
    });

    it('says which page of how many is on screen', () => {
        expect(history([trade()], { page: 2, pageCount: 5 }).get('.trade-history__page').text()).toBe(
            i18n.global.t('common.pageOf', { page: 2, pages: 5 }),
        );
    });

    it('walks the pages', async () => {
        const wrapper = history([trade()], { page: 2, pageCount: 5 });

        await wrapper.findAll('.trade-history__pager .btn')[0]?.trigger('click');
        await wrapper.findAll('.trade-history__pager .btn')[1]?.trigger('click');

        expect(wrapper.emitted('page')).toEqual([[1], [3]]);
    });

    it('stops at either end of the log', () => {
        const first = history([trade()], { page: 1, pageCount: 5 });
        const last = history([trade()], { page: 5, pageCount: 5 });

        expect(first.findAll('.trade-history__pager .btn')[0]?.attributes('disabled')).toBeDefined();
        expect(last.findAll('.trade-history__pager .btn')[1]?.attributes('disabled')).toBeDefined();
    });
});
