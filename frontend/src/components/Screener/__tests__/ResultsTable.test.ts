import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { ScreenerResult } from '@/api/screener';
import { i18n } from '@/i18n';
import { formatCompact, formatNumber } from '@/utils/formatters';
import ResultsTable from '@/components/screener/ResultsTable.vue';

const COLUMNS = ['TimeSeries.close', 'MarketCapitalization', 'Gap'];

const result = (symbol: string, over: Record<string, unknown> = {}): ScreenerResult => ({
    symbol,
    name: `${symbol} Inc`,
    assetType: 'Stock',
    sector: 'Tech',
    exchange: 'NASDAQ',
    TimeSeries: { close: 123.456 },
    MarketCapitalization: 2_500_000_000,
    Gap: 1.25,
    ...over,
});

const table = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(ResultsTable, { props: { items: [result('AAPL')], columns: COLUMNS, ...props } });

const cells = (wrapper: VueWrapper): string[] =>
    wrapper.findAll('.results-table__td--figure').map((node) => node.text());

describe('ResultsTable', () => {
    it('heads the symbol, the name, each column and the actions', () => {
        expect(table().findAll('.results-table__th')).toHaveLength(6);
    });

    it('renders one row per result', () => {
        expect(table({ items: [result('AAPL'), result('MSFT')] }).findAll('.results-table__row')).toHaveLength(2);
    });

    it('skips a column the catalogue does not know how to render', () => {
        expect(table({ columns: [...COLUMNS, 'MadeUpField'] }).findAll('.results-table__td--figure')).toHaveLength(3);
    });

    it('reads a nested path out of the row', () => {
        expect(cells(table())[0]).toBe(formatNumber(123.456, 2));
    });

    it('abbreviates the figures that would otherwise be unreadable', () => {
        expect(cells(table())[1]).toBe(formatCompact(2_500_000_000));
    });

    it('suffixes a percentage column', () => {
        expect(cells(table())[2]).toBe(`${formatNumber(1.25, 2)}%`);
    });

    it('dashes a missing figure rather than printing null', () => {
        expect(
            cells(table({ items: [result('AAPL', { TimeSeries: {}, MarketCapitalization: null, Gap: '' })] })),
        ).toEqual(['—', '—', '—']);
    });

    it('dashes a figure that is not finite', () => {
        expect(cells(table({ items: [result('AAPL', { Gap: Number.POSITIVE_INFINITY })] }))[2]).toBe('—');
    });

    it('dashes a name the vendor never supplied', () => {
        expect(
            table({ items: [result('AAPL', { name: null })] })
                .get('.results-table__td--name')
                .text(),
        ).toBe('—');
    });

    it('colours a percentage by its sign, and nothing else', () => {
        const up = table({ items: [result('AAPL', { Gap: 1.25 })] });
        const down = table({ items: [result('AAPL', { Gap: -1.25 })] });

        expect(up.findAll('.results-table__td--figure')[2]?.classes()).toContain('results-table__td--up');
        expect(down.findAll('.results-table__td--figure')[2]?.classes()).toContain('results-table__td--down');
        expect(up.findAll('.results-table__td--figure')[0]?.classes()).not.toContain('results-table__td--up');
    });

    it('marks the selected row for a screen reader as well as for the eye', () => {
        const row = table({ items: [result('AAPL'), result('MSFT')], selected: 'MSFT' }).findAll(
            '.results-table__row',
        )[1];

        expect(row?.classes()).toContain('results-table__row--selected');
        expect(row?.attributes('aria-selected')).toBe('true');
    });

    it('selects the row that was clicked', async () => {
        const wrapper = table({ items: [result('AAPL'), result('MSFT')] });

        await wrapper.findAll('.results-table__row')[1]?.trigger('click');

        expect(wrapper.emitted('select')?.[0]).toEqual(['MSFT']);
    });

    it('selects the row that was entered', async () => {
        const wrapper = table();

        await wrapper.get('.results-table__row').trigger('keydown.enter');

        expect(wrapper.emitted('select')?.[0]).toEqual(['AAPL']);
    });

    it('walks the selection down and up with the arrow keys', async () => {
        const wrapper = table({ items: [result('AAPL'), result('MSFT')], selected: 'AAPL' });

        await wrapper.get('.results-table__row').trigger('keydown', { key: 'ArrowDown' });
        expect(wrapper.emitted('select')?.[0]).toEqual(['MSFT']);

        await wrapper.setProps({ selected: 'MSFT' });
        await wrapper.get('.results-table__row').trigger('keydown', { key: 'ArrowUp' });
        expect(wrapper.emitted('select')?.[1]).toEqual(['AAPL']);
    });

    it('leaves the page to scroll when the selection is already at the end', async () => {
        const wrapper = table({ selected: 'AAPL' });

        await wrapper.get('.results-table__row').trigger('keydown', { key: 'ArrowDown' });

        expect(wrapper.emitted('select')).toBeUndefined();
    });

    it('ignores a key that is not an arrow', async () => {
        const wrapper = table({ selected: 'AAPL' });

        await wrapper.get('.results-table__row').trigger('keydown', { key: 'Tab' });

        expect(wrapper.emitted('select')).toBeUndefined();
    });

    it('hides a row without also selecting it', async () => {
        const wrapper = table();

        await wrapper.get('.results-table__action').trigger('click');

        expect(wrapper.emitted('toggleHidden')?.[0]).toEqual(['AAPL']);
        expect(wrapper.emitted('select')).toBeUndefined();
    });

    it('offers to unhide a row that is already hidden', () => {
        const wrapper = table({ hiddenSymbols: ['AAPL'] });

        expect(wrapper.get('.results-table__action').attributes('aria-label')).toBe(
            i18n.global.t('screener.unhide', { symbol: 'AAPL' }),
        );
    });

    it('dims itself while a reload is in flight', () => {
        expect(table({ pending: true }).classes()).toContain('results-table--pending');
    });
});
