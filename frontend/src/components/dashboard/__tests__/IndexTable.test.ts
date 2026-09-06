import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { IndexPerformance } from '@ereuna/shared';
import IndexTable from '@/components/dashboard/IndexTable.vue';

const row = (symbol: string, over: Partial<IndexPerformance> = {}): IndexPerformance => ({
    symbol,
    lastPrice: 100,
    oneDay: 0.01,
    oneMonth: -0.02,
    fourMonth: 0.03,
    oneYear: 0.04,
    yearToDate: 0.05,
    ...over,
});

const table = (indexes: IndexPerformance[]): VueWrapper => mount(IndexTable, { props: { indexes } });

const symbols = (wrapper: VueWrapper): string[] => wrapper.findAll('.index-table__symbol').map((node) => node.text());

describe('IndexTable', () => {
    it('orders broad market first, then size, then abroad', () => {
        expect(symbols(table([row('EEM'), row('SPY'), row('IWM'), row('QQQ')]))).toEqual(['SPY', 'QQQ', 'IWM', 'EEM']);
    });

    it('sorts an unnamed ETF after the six it knows', () => {
        expect(symbols(table([row('VTI'), row('DIA')]))).toEqual(['DIA', 'VTI']);
    });

    it('leaves the caller list untouched', () => {
        const indexes = [row('QQQ'), row('SPY')];

        table(indexes);

        expect(indexes[0]?.symbol).toBe('QQQ');
    });

    it('dashes a period that has no figure', () => {
        const wrapper = table([row('SPY', { lastPrice: null, oneDay: null })]);
        const cells = wrapper.findAll('.index-table__figure').map((node) => node.text());

        expect(cells[0]).toBe('—');
        expect(cells[1]).toBe('—');
    });

    it('colours a figure by its direction', () => {
        const wrapper = table([row('SPY', { oneDay: 0.01, oneMonth: -0.02, fourMonth: 0 })]);
        const cells = wrapper.findAll('.index-table__figure');

        expect(cells[1]?.classes()).toContain('index-table__figure--up');
        expect(cells[2]?.classes()).toContain('index-table__figure--down');
        expect(cells[3]?.classes()).toContain('index-table__figure--flat');
    });

    it('heads every column and names every row', () => {
        const wrapper = table([row('SPY')]);

        expect(wrapper.findAll('thead th')).toHaveLength(7);
        expect(wrapper.get('tbody th').attributes('scope')).toBe('row');
    });
});
