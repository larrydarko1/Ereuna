<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PortfolioStatsSnapshot } from '@ereuna/shared';
import { direction, formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';

const { snapshot } = defineProps<{ snapshot: PortfolioStatsSnapshot }>();

const { t } = useI18n();

/** A ratio the server could not compute has no value, not a value of zero. */
function ratio(value: number | null): string {
    return value === null ? '—' : formatNumber(value, 2);
}

function days(value: number): string {
    return `${formatNumber(value, 1)} ${t('portfolio.days')}`;
}

const stats = computed(() => {
    const s = snapshot;

    return [
        { key: 'realizedPL', label: t('portfolio.realizedPL'), value: formatCurrency(s.realizedPL), tone: direction(s.realizedPL) },
        { key: 'realizedPLPercent', label: t('portfolio.realizedPLPercent'), value: formatPercent(s.realizedPLPercent), tone: direction(s.realizedPLPercent) },
        { key: 'trades', label: t('portfolio.trades'), value: formatNumber(s.winnerCount + s.loserCount + s.breakevenCount, 0), tone: 'flat' as const },
        { key: 'winRate', label: t('portfolio.winRate'), value: `${formatNumber(s.winnerPercent, 1)}%`, tone: 'flat' as const },
        { key: 'winners', label: t('portfolio.winningTrades'), value: formatNumber(s.winnerCount, 0), tone: 'up' as const },
        { key: 'losers', label: t('portfolio.losingTrades'), value: formatNumber(s.loserCount, 0), tone: 'down' as const },
        { key: 'breakeven', label: t('portfolio.breakevenTrades'), value: formatNumber(s.breakevenCount, 0), tone: 'flat' as const },
        { key: 'avgGain', label: t('portfolio.avgGainPercent'), value: formatPercent(s.avgGain), tone: 'up' as const },
        { key: 'avgLoss', label: t('portfolio.avgLossPercent'), value: formatPercent(s.avgLoss), tone: 'down' as const },
        { key: 'avgGainAbs', label: t('portfolio.avgGain'), value: formatCurrency(s.avgGainAbs), tone: 'up' as const },
        { key: 'avgLossAbs', label: t('portfolio.avgLoss'), value: formatCurrency(s.avgLossAbs), tone: 'down' as const },
        { key: 'avgPositionSize', label: t('portfolio.avgPositionSize'), value: formatCurrency(s.avgPositionSize), tone: 'flat' as const },
        { key: 'holdWinners', label: t('portfolio.avgHoldTimeWinners'), value: days(s.avgHoldTimeWinners), tone: 'flat' as const },
        { key: 'holdLosers', label: t('portfolio.avgHoldTimeLosers'), value: days(s.avgHoldTimeLosers), tone: 'flat' as const },
        { key: 'gainLossRatio', label: t('portfolio.gainLossRatio'), value: ratio(s.gainLossRatio), tone: 'flat' as const },
        { key: 'profitFactor', label: t('portfolio.profitFactor'), value: ratio(s.profitFactor), tone: 'flat' as const },
        { key: 'riskRewardRatio', label: t('portfolio.riskRewardRatio'), value: ratio(s.riskRewardRatio), tone: 'flat' as const },
        { key: 'sortinoRatio', label: t('portfolio.sortinoRatio'), value: ratio(s.sortinoRatio), tone: 'flat' as const },
        { key: 'longCount', label: t('portfolio.longPosition'), value: formatNumber(s.longCount, 0), tone: 'flat' as const },
        { key: 'shortCount', label: t('portfolio.shortPosition'), value: formatNumber(s.shortCount, 0), tone: 'flat' as const },
        { key: 'totalCommission', label: t('portfolio.fees'), value: formatCurrency(s.totalCommission), tone: 'flat' as const },
        {
            key: 'biggestWinner',
            label: t('portfolio.biggestWinner'),
            value: s.biggestWinner === null ? '—' : `${s.biggestWinner.ticker} ${formatCurrency(s.biggestWinner.amount)}`,
            tone: 'up' as const,
        },
        {
            key: 'biggestLoser',
            label: t('portfolio.biggestLoser'),
            value: s.biggestLoser === null ? '—' : `${s.biggestLoser.ticker} ${formatCurrency(s.biggestLoser.amount)}`,
            tone: 'down' as const,
        },
    ];
});
</script>

<template>
    <div class="stats-grid">
        <div v-for="stat in stats" :key="stat.key" class="stats-grid__item">
            <span class="stats-grid__label">{{ stat.label }}</span>
            <span class="stats-grid__value" :class="`stats-grid__value--${stat.tone}`">{{ stat.value }}</span>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.4em 1em;

    &__item {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5em;
        padding: 0.3em 0;
        border-bottom: $border-width solid $color-elevated;
    }

    &__label {
        font-size: $font-size-xs;
        color: $color-text-muted;
    }

    &__value {
        font-family: $font-mono;
        font-size: $font-size-sm;
        color: $color-text;
        white-space: nowrap;

        &--up {
            color: $color-positive;
        }

        &--down {
            color: $color-negative;
        }
    }
}
</style>
