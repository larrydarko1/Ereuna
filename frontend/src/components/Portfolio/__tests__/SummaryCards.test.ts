import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { PortfolioSummary } from '@/api/portfolio';
import { i18n } from '@/i18n';
import { summary } from '@/__tests__/support/portfolio';
import { formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';
import SummaryCards from '@/components/portfolio/SummaryCards.vue';

const cards = (over: Partial<PortfolioSummary> = {}): VueWrapper =>
    mount(SummaryCards, { props: { summary: summary(over) } });

const card = (wrapper: VueWrapper, index: number): { value: string; note: string | null } => {
    const node = wrapper.findAll('.summary-cards__card')[index];
    if (node === undefined) throw new Error(`no card at ${index}`);
    const note = node.find('.summary-cards__note');
    return { value: node.get('.summary-cards__value').text(), note: note.exists() ? note.text() : null };
};

describe('SummaryCards', () => {
    it('shows the six figures the page is read for', () => {
        expect(cards().findAll('.summary-cards__card')).toHaveLength(6);
    });

    it('notes the base value beside the total, once one is declared', () => {
        expect(card(cards(), 0).note).toContain(formatCurrency(100_000));
        expect(card(cards({ baseValue: 0 }), 0).note).toBeNull();
    });

    it('dashes the return rather than claiming zero with nothing to measure against', () => {
        expect(card(cards({ totalPL: null, totalPLPercent: null }), 1)).toEqual({ value: '—', note: null });
    });

    it('notes the return as a percentage of the base value', () => {
        expect(card(cards({ totalPL: 5_000, totalPLPercent: 0.05 }), 1).note).toBe(formatPercent(0.05));
    });

    it('colours a gain and a loss apart', () => {
        const gain = cards({ unrealizedPL: 5_000 }).findAll('.summary-cards__value')[2];
        const loss = cards({ unrealizedPL: -5_000 }).findAll('.summary-cards__value')[2];

        expect(gain?.classes()).toContain('summary-cards__value--up');
        expect(loss?.classes()).toContain('summary-cards__value--down');
    });

    it('calls negative cash a margin loan rather than an error', () => {
        const borrowed = cards({ cash: -5_000 });

        expect(card(borrowed, 3).note).toBe(i18n.global.t('portfolio.marginLoan'));
        expect(borrowed.findAll('.summary-cards__value')[3]?.classes()).toContain('summary-cards__value--down');
    });

    it('says nothing extra about cash in hand', () => {
        expect(card(cards(), 3).note).toBeNull();
    });

    it('shows gross exposure with net beside it', () => {
        expect(card(cards(), 4)).toEqual({
            value: formatCurrency(90_000),
            note: `${i18n.global.t('portfolio.netExposure')} ${formatCurrency(90_000)}`,
        });
    });

    it('shows leverage used against the limit', () => {
        expect(card(cards({ leverageUsed: 0.9, leverage: 2 }), 5).value).toBe(
            `${formatNumber(0.9, 2)}× / ${formatNumber(2, 1)}×`,
        );
    });

    it('shows the limit alone while nothing is borrowed against it', () => {
        expect(card(cards({ leverageUsed: null }), 5).value).toBe(`${formatNumber(2, 1)}×`);
    });

    it('flags leverage past the limit', () => {
        const over = cards({ leverageUsed: 2.5, leverage: 2 });

        expect(over.findAll('.summary-cards__value')[5]?.classes()).toContain('summary-cards__value--down');
    });
});
