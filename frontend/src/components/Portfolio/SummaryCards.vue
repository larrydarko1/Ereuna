<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PortfolioSummary } from '@/api/portfolio';
import { direction, formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';

type Card = {
    key: string;
    label: string;
    value: string;
    note: string | null;
    tone: 'up' | 'down' | 'flat';
};

const { summary } = defineProps<{ summary: PortfolioSummary }>();

const { t } = useI18n();

const cards = computed<Card[]>(() => {
    const s = summary;

    return [
        {
            key: 'totalValue',
            label: t('portfolio.totalValue'),
            value: formatCurrency(s.totalValue),
            note: s.baseValue > 0 ? `${t('portfolio.baseValue')} ${formatCurrency(s.baseValue)}` : null,
            tone: 'flat',
        },
        {
            key: 'totalPL',
            label: t('portfolio.totalPL'),
            // Null until a base value is declared: there is no return without
            // something to measure it against, and showing 0% would be a claim.
            value: s.totalPL === null ? '—' : formatCurrency(s.totalPL),
            note: s.totalPLPercent === null ? null : formatPercent(s.totalPLPercent),
            tone: direction(s.totalPL),
        },
        {
            key: 'unrealizedPL',
            label: t('portfolio.unrealizedPL'),
            value: formatCurrency(s.unrealizedPL),
            note: null,
            tone: direction(s.unrealizedPL),
        },
        {
            key: 'cash',
            label: t('portfolio.cash'),
            value: formatCurrency(s.cash),
            // Negative cash is the margin loan, not an error, and saying so is
            // the difference between a borrowed position and a broken one.
            note: s.cash < 0 ? t('portfolio.marginLoan') : null,
            tone: s.cash < 0 ? 'down' : 'flat',
        },
        {
            key: 'exposure',
            label: t('portfolio.grossExposure'),
            value: formatCurrency(s.grossExposure),
            note: `${t('portfolio.netExposure')} ${formatCurrency(s.netExposure)}`,
            tone: 'flat',
        },
        {
            key: 'leverage',
            label: t('portfolio.leverage'),
            value:
                s.leverageUsed === null
                    ? `${formatNumber(s.leverage, 1)}×`
                    : `${formatNumber(s.leverageUsed, 2)}× / ${formatNumber(s.leverage, 1)}×`,
            note: `${t('portfolio.buyingPower')} ${formatCurrency(s.buyingPower)}`,
            tone: s.leverageUsed !== null && s.leverageUsed > s.leverage ? 'down' : 'flat',
        },
    ];
});
</script>

<template>
    <div class="summary-cards">
        <article v-for="card in cards" :key="card.key" class="summary-cards__card">
            <h3 class="summary-cards__label">{{ card.label }}</h3>
            <p class="summary-cards__value" :class="`summary-cards__value--${card.tone}`">{{ card.value }}</p>
            <p v-if="card.note !== null" class="summary-cards__note">{{ card.note }}</p>
        </article>
    </div>
</template>

<style lang="scss" scoped>
.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.75em;
}

.summary-cards__card {
    padding: 0.75em 1em;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;
}

.summary-cards__label {
    margin: 0;
    font-size: $font-size-xs;
    font-weight: $font-weight-regular;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.summary-cards__value {
    margin: 0.25em 0 0;
    font-family: $font-mono;
    font-size: $font-size-lg;
    color: $color-text;

    &--up {
        color: $color-positive;
    }

    &--down {
        color: $color-negative;
    }
}

.summary-cards__note {
    margin: 0.15em 0 0;
    font-size: $font-size-xs;
    color: $color-text-muted;
}
</style>
