<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { AssetProfile } from '@/api/chart';
import PriceChart from '@/components/charts/PriceChart.vue';

const { symbol, profile = null } = defineProps<{
    symbol: string;
    profile?: AssetProfile | null;
}>();

const { t } = useI18n();
</script>

<template>
    <p
        v-if="symbol === ''"
        class="screener-charts__empty"
        >{{ t('screener.selectRow') }}</p
    >

    <!-- Daily over weekly: the pair is the point, so neither is a click away -->
    <div
        v-else
        class="screener-charts">
        <PriceChart
            :key="`${symbol}-daily`"
            :symbol="symbol"
            :profile="profile"
            initial-timeframe="daily"
            class="screener-charts__pane" />
        <PriceChart
            :key="`${symbol}-weekly`"
            :symbol="symbol"
            :profile="profile"
            initial-timeframe="weekly"
            class="screener-charts__pane" />
    </div>
</template>

<style lang="scss" scoped>
/* –––––– Stack –––––– */

.screener-charts {
    display: grid;
    gap: $space-3;
    grid-template-rows: 1fr 1fr;

    @include above($bp-lg) {
        height: 80dvh;
    }
}

.screener-charts__pane {
    min-height: 260px;
}

/* –––––– Placeholder –––––– */

.screener-charts__empty {
    margin: 0;
    padding: $space-5;
    color: $color-text-muted;
    font-size: $font-size-sm;
    text-align: center;
}
</style>
