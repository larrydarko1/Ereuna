import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { formatCompact, formatNumber } from '@/utils/formatters';
import FinancialsPanel from '@/components/charts/FinancialsPanel.vue';

type Metric = 'eps' | 'earnings' | 'sales';

const quarter = (date: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
    fiscalDateEnding: date,
    reportedEPS: 1,
    netIncome: 1_000_000,
    totalRevenue: 5_000_000,
    ...over,
});

const panel = (rows: Record<string, unknown>[], metric: Metric = 'eps'): VueWrapper =>
    mount(FinancialsPanel, { props: { rows, metric } });

const cells = (wrapper: VueWrapper, row = 0): string[] =>
    wrapper
        .findAll('tbody tr')
        [row]?.findAll('td')
        .map((node) => node.text()) ?? [];

describe('FinancialsPanel', () => {
    it('shows one row per quarter the vendor reported', () => {
        expect(panel([quarter('2026-03-31'), quarter('2025-12-31')]).findAll('tbody tr')).toHaveLength(2);
    });

    it('skips a row with no fiscal date to key it by', () => {
        expect(panel([quarter('2026-03-31'), { reportedEPS: 2 }]).findAll('tbody tr')).toHaveLength(1);
    });

    it('says which figure it has none of', () => {
        expect(panel([], 'sales').get('.financials__empty').text()).toBe(i18n.global.t('sidebar.noSalesData'));
        expect(panel([], 'earnings').get('.financials__empty').text()).toBe(i18n.global.t('sidebar.noEarningsData'));
    });

    it('reads EPS to the cent and the large figures compactly', () => {
        expect(cells(panel([quarter('2026-03-31', { reportedEPS: 1.234 })]))[0]).toBe(formatNumber(1.234, 2));
        expect(cells(panel([quarter('2026-03-31')], 'sales'))[0]).toBe(formatCompact(5_000_000));
    });

    it('measures the quarter against the one before it', () => {
        const wrapper = panel([quarter('2026-03-31', { reportedEPS: 1.2 }), quarter('2025-12-31', { reportedEPS: 1 })]);

        expect(cells(wrapper)[1]).toBe(`${formatNumber(20, 1)}%`);
    });

    it('measures the quarter against the same quarter a year back', () => {
        const rows = [
            quarter('2026-03-31', { reportedEPS: 2 }),
            quarter('2025-12-31', { reportedEPS: 1.8 }),
            quarter('2025-09-30', { reportedEPS: 1.6 }),
            quarter('2025-06-30', { reportedEPS: 1.4 }),
            quarter('2025-03-31', { reportedEPS: 1 }),
        ];

        expect(cells(panel(rows))[2]).toBe(`${formatNumber(100, 1)}%`);
    });

    it('dashes a comparison with no earlier quarter to make it against', () => {
        expect(cells(panel([quarter('2026-03-31')]))).toEqual([formatNumber(1, 2), '—', '—']);
    });

    it('dashes a figure the vendor left out', () => {
        expect(cells(panel([quarter('2026-03-31', { reportedEPS: null })]))[0]).toBe('—');
    });

    it('colours growth and contraction apart, and neither for a missing one', () => {
        const up = panel([quarter('2026-03-31', { reportedEPS: 1.2 }), quarter('2025-12-31', { reportedEPS: 1 })]);
        const down = panel([quarter('2026-03-31', { reportedEPS: 0.8 }), quarter('2025-12-31', { reportedEPS: 1 })]);

        expect(up.findAll('tbody td')[1]?.classes()).toContain('financials__cell--up');
        expect(down.findAll('tbody td')[1]?.classes()).toContain('financials__cell--down');
        expect(
            panel([quarter('2026-03-31')])
                .findAll('tbody td')[1]
                ?.classes(),
        ).not.toContain('financials__cell--up');
    });

    it('reads the field that belongs to the metric it was asked for', () => {
        expect(cells(panel([quarter('2026-03-31')], 'earnings'))[0]).toBe(formatCompact(1_000_000));
    });
});
