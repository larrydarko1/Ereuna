<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PortfolioStatsSnapshot } from '@ereuna/shared';
import { direction, formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';

const { snapshot } = defineProps<{ snapshot: PortfolioStatsSnapshot }>();

const { t } = useI18n();

const stats = computed(() => {
    return [
        {
            key: 'realizedPL',
            label: t('portfolio.realizedPL'),
            value: formatCurrency(snapshot.realizedPL),
            tone: direction(snapshot.realizedPL),
        },
        {
            key: 'realizedPLPercent',
            label: t('portfolio.realizedPLPercent'),
            value: formatPercent(snapshot.realizedPLPercent),
            tone: direction(snapshot.realizedPLPercent),
        },
        {
            key: 'trades',
            label: t('portfolio.trades'),
            value: formatNumber(snapshot.winnerCount + snapshot.loserCount + snapshot.breakevenCount, 0),
            tone: 'flat' as const,
        },
        {
            key: 'winRate',
            label: t('portfolio.winRate'),
            value: `${formatNumber(snapshot.winnerPercent, 1)}%`,
            tone: 'flat' as const,
        },
        {
            key: 'winners',
            label: t('portfolio.winningTrades'),
            value: formatNumber(snapshot.winnerCount, 0),
            tone: 'up' as const,
        },
        {
            key: 'losers',
            label: t('portfolio.losingTrades'),
            value: formatNumber(snapshot.loserCount, 0),
            tone: 'down' as const,
        },
        {
            key: 'breakeven',
            label: t('portfolio.breakevenTrades'),
            value: formatNumber(snapshot.breakevenCount, 0),
            tone: 'flat' as const,
        },
        {
            key: 'avgGain',
            label: t('portfolio.avgGainPercent'),
            value: formatPercent(snapshot.avgGain),
            tone: 'up' as const,
        },
        {
            key: 'avgLoss',
            label: t('portfolio.avgLossPercent'),
            value: formatPercent(snapshot.avgLoss),
            tone: 'down' as const,
        },
        {
            key: 'avgGainAbs',
            label: t('portfolio.avgGain'),
            value: formatCurrency(snapshot.avgGainAbs),
            tone: 'up' as const,
        },
        {
            key: 'avgLossAbs',
            label: t('portfolio.avgLoss'),
            value: formatCurrency(snapshot.avgLossAbs),
            tone: 'down' as const,
        },
        {
            key: 'avgPositionSize',
            label: t('portfolio.avgPositionSize'),
            value: formatCurrency(snapshot.avgPositionSize),
            tone: 'flat' as const,
        },
        {
            key: 'holdWinners',
            label: t('portfolio.avgHoldTimeWinners'),
            value: days(snapshot.avgHoldTimeWinners),
            tone: 'flat' as const,
        },
        {
            key: 'holdLosers',
            label: t('portfolio.avgHoldTimeLosers'),
            value: days(snapshot.avgHoldTimeLosers),
            tone: 'flat' as const,
        },
        {
            key: 'gainLossRatio',
            label: t('portfolio.gainLossRatio'),
            value: ratio(snapshot.gainLossRatio),
            tone: 'flat' as const,
        },
        {
            key: 'profitFactor',
            label: t('portfolio.profitFactor'),
            value: ratio(snapshot.profitFactor),
            tone: 'flat' as const,
        },
        {
            key: 'riskRewardRatio',
            label: t('portfolio.riskRewardRatio'),
            value: ratio(snapshot.riskRewardRatio),
            tone: 'flat' as const,
        },
        {
            key: 'sortinoRatio',
            label: t('portfolio.sortinoRatio'),
            value: ratio(snapshot.sortinoRatio),
            tone: 'flat' as const,
        },
        {
            key: 'longCount',
            label: t('portfolio.longPosition'),
            value: formatNumber(snapshot.longCount, 0),
            tone: 'flat' as const,
        },
        {
            key: 'shortCount',
            label: t('portfolio.shortPosition'),
            value: formatNumber(snapshot.shortCount, 0),
            tone: 'flat' as const,
        },
        {
            key: 'totalCommission',
            label: t('portfolio.fees'),
            value: formatCurrency(snapshot.totalCommission),
            tone: 'flat' as const,
        },
        {
            key: 'biggestWinner',
            label: t('portfolio.biggestWinner'),
            value:
                snapshot.biggestWinner === null
                    ? '—'
                    : `${snapshot.biggestWinner.ticker} ${formatCurrency(snapshot.biggestWinner.amount)}`,
            tone: 'up' as const,
        },
        {
            key: 'biggestLoser',
            label: t('portfolio.biggestLoser'),
            value:
                snapshot.biggestLoser === null
                    ? '—'
                    : `${snapshot.biggestLoser.ticker} ${formatCurrency(snapshot.biggestLoser.amount)}`,
            tone: 'down' as const,
        },
    ];
});

/** A ratio the server could not compute has no value, not a value of zero. */
function ratio(value: number | null): string {
    return value === null ? '—' : formatNumber(value, 2);
}

function days(value: number): string {
    return `${formatNumber(value, 1)} ${t('portfolio.days')}`;
}
</script>

<template>
    <div class="stats-grid">
        <div
            v-for="stat in stats"
            :key="stat.key"
            class="stats-grid__item">
            <span class="stats-grid__label">{{ stat.label }}</span>
            <span
                class="stats-grid__value"
                :class="`stats-grid__value--${stat.tone}`"
                >{{ stat.value }}</span
            >
        </div>
    </div>
</template>

<style lang="scss" scoped>
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.4em 1em;
}

.stats-grid__item {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5em;
    padding: 0.3em 0;
    border-bottom: $border-width solid $color-elevated;
}

.stats-grid__label {
    font-size: $font-size-xs;
    color: $color-text-muted;
}

.stats-grid__value {
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
</style>
