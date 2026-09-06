import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { ChartQuote } from '@/constants/chart';
import { i18n } from '@/i18n';
import { formatNumber, formatPercent, formatSigned } from '@/utils/formatters';
import ChartLegend from '@/components/charts/ChartLegend.vue';

const quote = (over: Partial<ChartQuote> = {}): ChartQuote =>
    ({ open: 100, high: 110, low: 95, close: 105, change: 5, changePercent: 0.05, ...over }) as ChartQuote;

const legend = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(ChartLegend, { props: { status: 'open', ...props } });

const values = (wrapper: VueWrapper): string[] => wrapper.findAll('.legend__value').map((node) => node.text());

describe('ChartLegend', () => {
    it('shows nothing about a bar the pointer is not over', () => {
        expect(legend().find('.legend__quote').exists()).toBe(false);
    });

    it('reads all four prices of a candle', () => {
        const wrapper = legend({ quote: quote() });

        expect(values(wrapper).slice(0, 4)).toEqual([
            formatNumber(100),
            formatNumber(110),
            formatNumber(95),
            formatNumber(105),
        ]);
    });

    it('reads one price for a chart that only draws one', () => {
        const wrapper = legend({ quote: quote(), priceOnly: true });

        expect(wrapper.findAll('.legend__term')[0]?.text()).toContain(i18n.global.t('charts.quote.price'));
        expect(values(wrapper)).toHaveLength(2);
    });

    it('shows the change in both money and percent', () => {
        expect(values(legend({ quote: quote() }))[4]).toBe(`${formatSigned(5)} (${formatPercent(0.05)})`);
    });

    it('colours the change by its sign, counting flat as up', () => {
        const up = legend({ quote: quote({ change: 0 }) });
        const down = legend({ quote: quote({ change: -5 }) });

        expect(up.findAll('.legend__value')[4]?.classes()).toContain('legend__value--up');
        expect(down.findAll('.legend__value')[4]?.classes()).toContain('legend__value--down');
    });

    it('names each overlay in the colour it is drawn in', () => {
        const wrapper = legend({ overlays: [{ label: 'SMA 50', color: '#ff0000' }] });

        expect(wrapper.get('.legend__overlays li').text()).toBe('SMA 50');
        expect(wrapper.get('.legend__overlays li').attributes('style')).toContain('color: rgb(255, 0, 0)');
    });

    it('shows no overlay list when nothing is overlaid', () => {
        expect(legend().find('.legend__overlays').exists()).toBe(false);
    });

    it('flags what is unusual about the instrument itself', () => {
        expect(legend({ badges: ['Delisted', 'EOD only'] }).findAll('.legend__badge')).toHaveLength(2);
    });

    it('names the market state', () => {
        expect(legend({ status: 'closed' }).get('.legend__status').text()).toBe(i18n.global.t('charts.market.closed'));
        expect(legend({ status: 'closed' }).get('.legend__status').classes()).toContain('legend__status--closed');
    });

    it('names the holiday the market is shut for', () => {
        expect(legend({ status: 'holiday', holidayName: 'Thanksgiving' }).get('.legend__status').text()).toBe(
            `${i18n.global.t('charts.market.holiday')} · Thanksgiving`,
        );
    });

    it('says only that it is a holiday when the calendar did not name it', () => {
        expect(legend({ status: 'holiday' }).get('.legend__status').text()).toBe(
            i18n.global.t('charts.market.holiday'),
        );
    });

    it('says nothing about the market until the calendar has been read', () => {
        expect(legend({ statusPending: true }).find('.legend__status').exists()).toBe(false);
    });
});
