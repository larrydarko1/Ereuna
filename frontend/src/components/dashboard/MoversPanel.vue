<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { MoverRow } from '@ereuna/shared';
import { formatPercent } from '@/utils/formatters';

const { gainers, losers } = defineProps<{
    gainers: MoverRow[];
    losers: MoverRow[];
}>();

const { t } = useI18n();
</script>

<template>
    <div class="movers">
        <section class="movers__column">
            <h3 class="movers__title">{{ t('dashboard.movers.topGainers') }}</h3>
            <ol class="movers__list">
                <li v-for="row in gainers" :key="row.symbol" class="movers__row">
                    <span class="movers__symbol">{{ row.symbol }}</span>
                    <span class="movers__return movers__return--positive">{{ formatPercent(row.dailyReturn) }}</span>
                </li>
            </ol>
        </section>

        <section class="movers__column">
            <h3 class="movers__title">{{ t('dashboard.movers.topLosers') }}</h3>
            <ol class="movers__list">
                <li v-for="row in losers" :key="row.symbol" class="movers__row">
                    <span class="movers__symbol">{{ row.symbol }}</span>
                    <span class="movers__return movers__return--negative">{{ formatPercent(row.dailyReturn) }}</span>
                </li>
            </ol>
        </section>
    </div>
</template>

<style lang="scss" scoped>
.movers {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 1em;
}

.movers__column {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
}

.movers__title {
    margin: 0;
    font-size: $font-size-xs;
    font-weight: $font-weight-regular;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.movers__list {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
    margin: 0;
    padding: 0;
    list-style: none;
}

.movers__row {
    display: flex;
    justify-content: space-between;
    gap: 0.5em;
    font-size: $font-size-sm;
}

.movers__symbol {
    font-weight: $font-weight-medium;
    color: $color-text;
}

.movers__return {
    font-family: $font-mono;
    font-variant-numeric: tabular-nums;
}

.movers__return--positive {
    color: $color-positive;
}

.movers__return--negative {
    color: $color-negative;
}
</style>
