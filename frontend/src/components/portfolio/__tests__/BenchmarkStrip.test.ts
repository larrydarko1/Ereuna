import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { BenchmarkResult } from '@/api/portfolio';
import { i18n } from '@/i18n';
import { formatPercent } from '@/utils/formatters';
import BenchmarkStrip from '@/components/portfolio/BenchmarkStrip.vue';

const entry = (over: Partial<BenchmarkResult> = {}): BenchmarkResult => ({
    symbol: 'SPY',
    inceptionPrice: 400,
    currentPrice: 440,
    returnPercent: 0.1,
    portfolioReturnPercent: 0.15,
    outperformance: 0.05,
    ...over,
});

const strip = (benchmarks: BenchmarkResult[]): VueWrapper => mount(BenchmarkStrip, { props: { benchmarks } });

describe('BenchmarkStrip', () => {
    it('shows one card per benchmark', () => {
        expect(strip([entry(), entry({ symbol: 'QQQ' })]).findAll('.benchmark-strip__card')).toHaveLength(2);
    });

    it('says there is nothing to compare against yet', () => {
        const wrapper = strip([]);

        expect(wrapper.findAll('.benchmark-strip__card')).toHaveLength(0);
        expect(wrapper.get('.form-hint').text()).toBe(i18n.global.t('portfolio.noBenchmarkData'));
    });

    it('shows the three returns the comparison is made of', () => {
        const values = strip([entry()])
            .findAll('.benchmark-strip__stat dd')
            .map((node) => node.text());

        expect(values).toEqual([formatPercent(0.1), formatPercent(0.15), formatPercent(0.05)]);
    });

    it('says whether the portfolio is beating or lagging', () => {
        expect(
            strip([entry({ outperformance: 0.05 })])
                .get('.benchmark-strip__badge')
                .text(),
        ).toBe(i18n.global.t('portfolio.beating'));
        expect(
            strip([entry({ outperformance: -0.05 })])
                .get('.benchmark-strip__badge')
                .text(),
        ).toBe(i18n.global.t('portfolio.lagging'));
    });

    it('counts a dead heat as beating rather than lagging', () => {
        expect(
            strip([entry({ outperformance: 0 })])
                .get('.benchmark-strip__badge')
                .text(),
        ).toBe(i18n.global.t('portfolio.beating'));
    });

    it('colours the badge by the sign of the gap', () => {
        expect(
            strip([entry({ outperformance: -0.05 })])
                .get('.benchmark-strip__badge')
                .classes(),
        ).toContain('benchmark-strip__badge--down');
    });

    it('asks to edit the list it is showing', async () => {
        const wrapper = strip([]);

        await wrapper.get('.btn--small').trigger('click');

        expect(wrapper.emitted('edit')).toHaveLength(1);
    });
});
