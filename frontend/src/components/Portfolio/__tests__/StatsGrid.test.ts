import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { PortfolioStatsSnapshot } from '@ereuna/shared';
import { i18n } from '@/i18n';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import StatsGrid from '@/components/portfolio/StatsGrid.vue';

const snapshot = (over: Partial<PortfolioStatsSnapshot> = {}): PortfolioStatsSnapshot => ({
    realizedPL: 1_500,
    realizedPLPercent: 15,
    winnerCount: 6,
    loserCount: 3,
    breakevenCount: 1,
    winnerPercent: 60,
    loserPercent: 30,
    breakevenPercent: 10,
    avgGain: 12.5,
    avgLoss: -6.25,
    avgGainAbs: 300,
    avgLossAbs: -150,
    avgPositionSize: 2_000,
    avgHoldTimeWinners: 12.4,
    avgHoldTimeLosers: 3.2,
    gainLossRatio: 2,
    profitFactor: 1.8,
    riskRewardRatio: 1.5,
    sortinoRatio: null,
    totalCommission: 42,
    longCount: 8,
    shortCount: 2,
    biggestWinner: { ticker: 'AAPL', amount: 900, tradeCount: 3 },
    biggestLoser: { ticker: 'TSLA', amount: -400, tradeCount: 2 },
    tradeReturnsChart: { bins: [], medianBinIndex: -1 },
    ...over,
});

const grid = (over: Partial<PortfolioStatsSnapshot> = {}): VueWrapper =>
    mount(StatsGrid, { props: { snapshot: snapshot(over) } });

const stat = (wrapper: VueWrapper, label: string): string => {
    const item = wrapper.findAll('.stats-grid__item').find((node) => node.get('.stats-grid__label').text() === label);
    if (item === undefined) throw new Error(`no stat labelled ${label}`);
    return item.get('.stats-grid__value').text();
};

describe('StatsGrid', () => {
    it('shows every statistic the snapshot carries', () => {
        expect(grid().findAll('.stats-grid__item')).toHaveLength(23);
    });

    it('counts the closed trades as the three outcomes together', () => {
        expect(stat(grid(), i18n.global.t('portfolio.trades'))).toBe('10');
    });

    it('shows the win rate as a percentage', () => {
        expect(stat(grid(), i18n.global.t('portfolio.winRate'))).toBe(`${formatNumber(60, 1)}%`);
    });

    it('shows hold times in days', () => {
        expect(stat(grid(), i18n.global.t('portfolio.avgHoldTimeWinners'))).toBe(
            `${formatNumber(12.4, 1)} ${i18n.global.t('portfolio.days')}`,
        );
    });

    it('dashes a ratio the server could not compute rather than showing zero', () => {
        expect(stat(grid(), i18n.global.t('portfolio.sortinoRatio'))).toBe('—');
        expect(stat(grid(), i18n.global.t('portfolio.profitFactor'))).toBe(formatNumber(1.8, 2));
    });

    it('names the extremes with the symbol they belong to', () => {
        expect(stat(grid(), i18n.global.t('portfolio.biggestWinner'))).toBe(`AAPL ${formatCurrency(900)}`);
    });

    it('dashes an extreme that does not exist yet', () => {
        expect(stat(grid({ biggestWinner: null, biggestLoser: null }), i18n.global.t('portfolio.biggestLoser'))).toBe(
            '—',
        );
    });

    it('colours the realised return by its sign', () => {
        const loss = grid({ realizedPL: -500, realizedPLPercent: -5 });

        expect(loss.get('.stats-grid__value').classes()).toContain('stats-grid__value--down');
        expect(grid().get('.stats-grid__value').classes()).toContain('stats-grid__value--up');
    });

    it('colours the winner and loser counts by what they are, not by their value', () => {
        const wrapper = grid({ winnerCount: 0, loserCount: 0 });
        const winners = wrapper
            .findAll('.stats-grid__item')
            .find((node) => node.get('.stats-grid__label').text() === i18n.global.t('portfolio.winningTrades'));

        expect(winners?.get('.stats-grid__value').classes()).toContain('stats-grid__value--up');
    });
});
