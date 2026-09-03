<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { ValuationRow } from '@ereuna/shared';
import { formatCurrency, formatRatio } from '@/utils/formatters';

const { undervalued, overvalued } = defineProps<{
    undervalued: ValuationRow[];
    overvalued: ValuationRow[];
}>();

const { t } = useI18n();
</script>

<template>
    <div class="valuation">
        <section class="valuation__column">
            <h3 class="valuation__title">{{ t('dashboard.valuation.undervalued') }}</h3>
            <ol class="valuation__list">
                <li v-for="row in undervalued" :key="row.symbol" class="valuation__row">
                    <span class="valuation__symbol">{{ row.symbol }}</span>
                    <span class="valuation__prices">
                        {{ formatCurrency(row.currentPrice) }} → {{ formatCurrency(row.intrinsicValue) }}
                    </span>
                    <span class="valuation__gap valuation__gap--positive">{{ formatRatio(row.gap, 0) }}</span>
                </li>
            </ol>
        </section>

        <section class="valuation__column">
            <h3 class="valuation__title">{{ t('dashboard.valuation.overvalued') }}</h3>
            <ol class="valuation__list">
                <li v-for="row in overvalued" :key="row.symbol" class="valuation__row">
                    <span class="valuation__symbol">{{ row.symbol }}</span>
                    <span class="valuation__prices">
                        {{ formatCurrency(row.currentPrice) }} → {{ formatCurrency(row.intrinsicValue) }}
                    </span>
                    <span class="valuation__gap valuation__gap--negative">{{ formatRatio(row.gap, 0) }}</span>
                </li>
            </ol>
        </section>
    </div>
</template>

<style lang="scss" scoped>
.valuation {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    gap: 1em;
}

.valuation__column {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
}

.valuation__title {
    margin: 0;
    font-size: $font-size-xs;
    font-weight: $font-weight-regular;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.valuation__list {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
    margin: 0;
    padding: 0;
    list-style: none;
}

.valuation__row {
    display: grid;
    grid-template-columns: 4rem 1fr auto;
    gap: 0.5em;
    align-items: baseline;
    font-size: $font-size-sm;
}

.valuation__symbol {
    font-weight: $font-weight-medium;
    color: $color-text;
}

.valuation__prices {
    font-family: $font-mono;
    font-size: $font-size-xs;
    color: $color-text-muted;
}

.valuation__gap {
    font-family: $font-mono;
    font-variant-numeric: tabular-nums;
}

.valuation__gap--positive {
    color: $color-positive;
}

.valuation__gap--negative {
    color: $color-negative;
}
</style>
