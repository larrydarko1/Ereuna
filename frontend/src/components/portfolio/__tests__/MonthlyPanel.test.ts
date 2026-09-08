import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { PortfolioValuePoint } from '@ereuna/shared';
import type { TradeRow } from '@/api/trades';
import { i18n } from '@/i18n';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import MonthlyPanel from '@/components/portfolio/MonthlyPanel.vue';

const point = (date: string, value: number): PortfolioValuePoint => ({ date, value });

const trade = (over: Partial<TradeRow> = {}): TradeRow => ({
    id: 't1',
    symbol: 'AAPL',
    action: 'buy',
    shares: 10,
    price: 190,
    total: 1900,
    commission: 1,
    tradeDate: '2026-01-15',
    createdAt: '2026-01-15T00:00:00.000Z',
    ...over,
});

const panel = (valueHistory: PortfolioValuePoint[], trades: TradeRow[] = []): VueWrapper =>
    mount(MonthlyPanel, { props: { valueHistory, trades } });

const rows = (wrapper: VueWrapper): string[][] =>
    wrapper.findAll('tbody tr').map((row) => [row.get('th').text(), ...row.findAll('td').map((cell) => cell.text())]);

describe('MonthlyPanel', () => {
    it('shows nothing but its heading until there is a history to read', () => {
        const wrapper = panel([]);

        expect(wrapper.find('table').exists()).toBe(false);
        expect(wrapper.find('.monthly-panel__tally').exists()).toBe(false);
    });

    it('closes each month on the last value written in it', () => {
        const wrapper = panel([
            point('2026-01-05', 100_000),
            point('2026-01-31', 110_000),
            point('2026-02-28', 121_000),
        ]);

        expect(rows(wrapper).map((row) => row[2])).toEqual([formatCurrency(121_000), formatCurrency(110_000)]);
    });

    it('reads newest first, which is the row people want', () => {
        const wrapper = panel([point('2026-01-31', 100_000), point('2026-02-28', 110_000)]);

        expect(rows(wrapper)[0]?.[0]).toContain('2026');
        expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    });

    it('opens a month on the month before it', () => {
        const wrapper = panel([point('2026-01-31', 100_000), point('2026-02-28', 110_000)]);

        expect(rows(wrapper)[0]?.[1]).toBe(formatCurrency(100_000));
    });

    it('opens the first month at its close less what was paid in', () => {
        const wrapper = panel(
            [point('2026-01-31', 100_000)],
            [trade({ action: 'deposit', symbol: null, total: 100_000 })],
        );

        expect(rows(wrapper)[0]?.[1]).toBe(formatCurrency(0));
        expect(rows(wrapper)[0]?.[4]).toBe(formatCurrency(0));
    });

    it('nets deposits against withdrawals inside one month', () => {
        const wrapper = panel(
            [point('2026-01-31', 100_000), point('2026-02-28', 105_000)],
            [
                trade({ id: 'd', action: 'deposit', symbol: null, total: 10_000, tradeDate: '2026-02-10' }),
                trade({ id: 'w', action: 'withdrawal', symbol: null, total: 4_000, tradeDate: '2026-02-20' }),
            ],
        );

        expect(rows(wrapper)[0]?.[3]).toBe(formatCurrency(6_000));
    });

    it('takes cash flow out of the profit, so a deposit is not a gain', () => {
        const wrapper = panel(
            [point('2026-01-31', 100_000), point('2026-02-28', 110_000)],
            [trade({ action: 'deposit', symbol: null, total: 10_000, tradeDate: '2026-02-10' })],
        );

        expect(rows(wrapper)[0]?.[4]).toBe(formatCurrency(0));
        expect(rows(wrapper)[0]?.[5]).toBe(formatPercent(0));
    });

    it('dashes a month with no money moved in or out', () => {
        const wrapper = panel([point('2026-01-31', 100_000), point('2026-02-28', 110_000)]);

        expect(rows(wrapper)[0]?.[3]).toBe('—');
    });

    it('reports no return rather than an infinite one for a month that opened at nothing', () => {
        const wrapper = panel(
            [point('2026-01-31', 100_000)],
            [trade({ action: 'deposit', symbol: null, total: 100_000, tradeDate: '2026-01-02' })],
        );

        expect(rows(wrapper)[0]?.[5]).toBe('—');
    });

    it('counts the trades in a month, ignoring cash movements', () => {
        const wrapper = panel(
            [point('2026-01-31', 100_000)],
            [
                trade({ id: 'a', tradeDate: '2026-01-10' }),
                trade({ id: 'b', action: 'sell', tradeDate: '2026-01-20' }),
                trade({ id: 'c', action: 'deposit', symbol: null, tradeDate: '2026-01-05' }),
            ],
        );

        expect(rows(wrapper)[0]?.[6]).toBe('2');
    });

    it('tallies the winning and losing months', () => {
        const wrapper = panel([
            point('2026-01-31', 100_000),
            point('2026-02-28', 110_000),
            point('2026-03-31', 105_000),
        ]);
        const tally = wrapper.findAll('.monthly-panel__tally-item').map((node) => node.text());

        expect(tally[0]).toBe(`${i18n.global.t('portfolio.winning')} 1`);
        expect(tally[1]).toBe(`${i18n.global.t('portfolio.losing')} 1`);
    });

    it('charts one bar per month, in the order they happened', () => {
        const wrapper = panel([
            point('2026-01-31', 100_000),
            point('2026-02-28', 110_000),
            point('2026-03-31', 121_000),
        ]);
        const heights = wrapper.findAll('rect').map((bar) => Number(bar.attributes('height')));

        expect(heights).toHaveLength(3);
        // January opened at its own close, so it is the flat one the chart starts on
        expect(heights[0]).toBeLessThan(heights[1] ?? 0);
    });

    it('keeps a month on its own calendar day, not on the reader clock', () => {
        const wrapper = panel([point('2026-02-01', 100_000), point('2026-03-01', 110_000)]);

        expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    });

    it('colours a losing month apart from a winning one', () => {
        const wrapper = panel([point('2026-01-31', 100_000), point('2026-02-28', 90_000)]);

        expect(wrapper.findAll('tbody .monthly-panel__num')[3]?.classes()).toContain('monthly-panel__num--down');
    });
});
