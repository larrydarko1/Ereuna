import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { ValuationRow } from '@ereuna/shared';
import { formatCurrency } from '@/utils/formatters';
import ValuationPanel from '@/components/dashboard/ValuationPanel.vue';

const row = (symbol: string, gap: number): ValuationRow => ({
    symbol,
    currentPrice: 100,
    intrinsicValue: 140,
    gap,
});

const panel = (undervalued: ValuationRow[], overvalued: ValuationRow[]): VueWrapper =>
    mount(ValuationPanel, { props: { undervalued, overvalued } });

describe('ValuationPanel', () => {
    it('splits the two verdicts into their own columns', () => {
        const columns = panel([row('AAPL', 0.4)], [row('TSLA', -0.3)]).findAll('.valuation__column');

        expect(columns[0]?.text()).toContain('AAPL');
        expect(columns[1]?.text()).toContain('TSLA');
    });

    it('shows the price it trades at beside the price it is worth', () => {
        const wrapper = panel([row('AAPL', 0.4)], []);

        expect(wrapper.get('.valuation__prices').text()).toBe(`${formatCurrency(100)} → ${formatCurrency(140)}`);
    });

    it('signs the gap by which column it is in', () => {
        const wrapper = panel([row('AAPL', 0.4)], [row('TSLA', -0.3)]);

        expect(wrapper.findAll('.valuation__gap--positive')).toHaveLength(1);
        expect(wrapper.findAll('.valuation__gap--negative')).toHaveLength(1);
    });

    it('renders empty columns without complaint', () => {
        expect(panel([], []).findAll('.valuation__row')).toHaveLength(0);
    });
});
