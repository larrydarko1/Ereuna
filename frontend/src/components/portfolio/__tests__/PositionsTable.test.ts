import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { ValuedPosition } from '@/api/portfolio';
import { i18n } from '@/i18n';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import PositionsTable from '@/components/portfolio/PositionsTable.vue';

const position = (over: Partial<ValuedPosition> = {}): ValuedPosition => ({
    symbol: 'AAPL',
    side: 'long',
    shares: 10,
    avgPrice: 100,
    lastClose: 110,
    marketValue: 1100,
    exposure: 1100,
    unrealizedPL: 100,
    unrealizedPLPercent: 10,
    weight: 50,
    ...over,
});

const table = (positions: ValuedPosition[], quotes: Record<string, number> = {}, cash = 5_000): VueWrapper =>
    mount(PositionsTable, { props: { positions, quotes, cash } });

const cells = (wrapper: VueWrapper): string[] => wrapper.findAll('tbody td').map((node) => node.text());

describe('PositionsTable', () => {
    it('shows one row per position', () => {
        expect(table([position(), position({ symbol: 'MSFT' })]).findAll('tbody tr')).toHaveLength(2);
    });

    it('says there is nothing held rather than showing an empty table', () => {
        const wrapper = table([]);

        expect(wrapper.get('.positions-table__empty').text()).toBe(i18n.global.t('portfolio.noActivePositions'));
    });

    it("keeps the server's own figures when no tick has arrived", () => {
        const wrapper = table([position()]);

        expect(cells(wrapper)[4]).toBe(formatCurrency(1100));
        expect(cells(wrapper)[5]).toBe(formatCurrency(100));
        expect(wrapper.find('.positions-table__live').exists()).toBe(false);
    });

    it('revalues a long against the live price', () => {
        const wrapper = table([position()], { AAPL: 120 });

        expect(cells(wrapper)[4]).toBe(formatCurrency(1200));
        expect(cells(wrapper)[5]).toBe(formatCurrency(200));
        expect(cells(wrapper)[6]).toBe(formatPercent(20));
        expect(wrapper.find('.positions-table__live').exists()).toBe(true);
    });

    it('profits a short as the price falls', () => {
        const wrapper = table([position({ side: 'short' })], { AAPL: 80 });

        expect(cells(wrapper)[5]).toBe(formatCurrency(200));
        expect(cells(wrapper)[6]).toBe(formatPercent(20));
    });

    it('leaves the return blank rather than dividing by a cost of nothing', () => {
        const wrapper = table([position({ avgPrice: 0 })], { AAPL: 120 });

        expect(cells(wrapper)[6]).toBe('—');
    });

    it('dashes every figure the server could not price', () => {
        const wrapper = table([
            position({
                lastClose: null,
                marketValue: null,
                unrealizedPL: null,
                unrealizedPLPercent: null,
                weight: null,
            }),
        ]);

        expect(cells(wrapper).slice(3)).toEqual(['—', '—', '—', '—', '—', i18n.global.t('portfolio.close')]);
    });

    it('names the side of each position', () => {
        expect(
            table([position({ side: 'short' })])
                .get('.positions-table__side')
                .text(),
        ).toBe(i18n.global.t('portfolio.short'));
        expect(table([position()]).get('.positions-table__side').classes()).toContain('positions-table__side--long');
    });

    it('colours a gain and a loss apart', () => {
        const gain = table([position()], { AAPL: 120 });
        const loss = table([position()], { AAPL: 80 });

        expect(gain.findAll('tbody .positions-table__num')[4]?.classes()).toContain('positions-table__num--up');
        expect(loss.findAll('tbody .positions-table__num')[4]?.classes()).toContain('positions-table__num--down');
    });

    it('foots the table with cash, flagged when it is borrowed', () => {
        expect(table([], {}, 5_000).get('tfoot .positions-table__num').text()).toBe(formatCurrency(5_000));
        expect(table([], {}, -5_000).get('tfoot .positions-table__num').classes()).toContain(
            'positions-table__num--down',
        );
    });

    it('asks to close the position it was told to, not a copy of the row', async () => {
        const held = position();
        const wrapper = table([held], { AAPL: 120 });

        await wrapper.get('tbody .btn').trigger('click');

        expect(wrapper.emitted('close')?.[0]).toEqual([held]);
    });
});
