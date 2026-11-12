import { mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { ValuedPosition } from '@ereuna/shared';

import PositionsTable from '@/components/portfolio/PositionsTable.vue';
import { i18n } from '@/i18n';
import { formatCurrency, formatPercent } from '@/utils/formatters';

const position = (over: Partial<ValuedPosition> = {}): ValuedPosition => ({
    symbol: 'AAPL',
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
    ...over,
});

const table = (positions: ValuedPosition[], cash = 5_000): VueWrapper =>
    mount(PositionsTable, { props: { positions, cash } });

const cells = (wrapper: VueWrapper): string[] => wrapper.findAll('tbody td').map((node) => node.text());

describe('PositionsTable', () => {
    it('shows one row per position', () => {
        expect(table([position(), position({ symbol: 'MSFT' })]).findAll('tbody tr')).toHaveLength(2);
    });

    it('says there is nothing held rather than showing an empty table', () => {
        const wrapper = table([]);

        expect(wrapper.get('.positions-table__empty').text()).toBe(i18n.global.t('portfolio.noActivePositions'));
    });

    // The server prices every row, live or not: the browser computes no portfolio number
    it('shows the figures the server sent, as they are', () => {
        const wrapper = table([
            position({ price: 120, marketValue: 1200, unrealizedPL: 200, unrealizedPLPercent: 20 }),
        ]);

        expect(cells(wrapper).slice(2, 7)).toEqual([
            formatCurrency(100),
            formatCurrency(120),
            formatCurrency(1200),
            formatCurrency(200),
            formatPercent(20),
        ]);
    });

    it('marks a price the server took from the session in progress', () => {
        expect(
            table([position({ live: true })])
                .find('.positions-table__live')
                .exists(),
        ).toBe(true);
        expect(table([position()]).find('.positions-table__live').exists()).toBe(false);
    });

    it('dashes every figure the server could not price', () => {
        const wrapper = table([
            position({
                price: null,
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
        const gain = table([position()]);
        const loss = table([position({ unrealizedPL: -200, unrealizedPLPercent: -20 })]);

        expect(gain.findAll('tbody .positions-table__num')[4]?.classes()).toContain('positions-table__num--up');
        expect(loss.findAll('tbody .positions-table__num')[4]?.classes()).toContain('positions-table__num--down');
    });

    it('foots the table with cash, flagged when it is borrowed', () => {
        expect(table([], 5_000).get('tfoot .positions-table__num').text()).toBe(formatCurrency(5_000));
        expect(table([], -5_000).get('tfoot .positions-table__num').classes()).toContain('positions-table__num--down');
    });

    it('asks to close the position it was told to, not a copy of the row', async () => {
        const held = position();
        const wrapper = table([held]);

        await wrapper.get('tbody .btn').trigger('click');

        expect(wrapper.emitted('close')?.[0]).toEqual([held]);
    });
});
