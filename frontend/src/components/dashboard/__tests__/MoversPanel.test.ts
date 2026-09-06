import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { MoverRow } from '@ereuna/shared';
import { formatPercent } from '@/utils/formatters';
import MoversPanel from '@/components/dashboard/MoversPanel.vue';

const panel = (gainers: MoverRow[], losers: MoverRow[]): VueWrapper =>
    mount(MoversPanel, { props: { gainers, losers } });

describe('MoversPanel', () => {
    it('lists gainers and losers in their own columns', () => {
        const wrapper = panel([{ symbol: 'AAPL', dailyReturn: 0.05 }], [{ symbol: 'F', dailyReturn: -0.04 }]);
        const columns = wrapper.findAll('.movers__column');

        expect(columns[0]?.text()).toContain('AAPL');
        expect(columns[1]?.text()).toContain('F');
    });

    it('formats each return as a percentage', () => {
        const wrapper = panel([{ symbol: 'AAPL', dailyReturn: 0.0512 }], []);

        expect(wrapper.get('.movers__return').text()).toBe(formatPercent(0.0512));
    });

    it('signs the two columns apart', () => {
        const wrapper = panel([{ symbol: 'AAPL', dailyReturn: 0.05 }], [{ symbol: 'F', dailyReturn: -0.04 }]);

        expect(wrapper.findAll('.movers__return--positive')).toHaveLength(1);
        expect(wrapper.findAll('.movers__return--negative')).toHaveLength(1);
    });

    it('renders empty columns without complaint', () => {
        expect(panel([], []).findAll('.movers__row')).toHaveLength(0);
    });
});
