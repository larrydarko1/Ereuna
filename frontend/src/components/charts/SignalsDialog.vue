<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { TradeSignal } from '@/api/chart';
import AppDialog from '@/components/ui/AppDialog.vue';
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters';

const { symbol, signals } = defineProps<{
    symbol: string;
    signals: readonly TradeSignal[];
}>();

const emit = defineEmits<{ close: [] }>();

const { t, te } = useI18n();

/**
 * The strategy's name, translated when it is one we know.
 * The aggregator invents these keys (`RSI_Oversold`, `MACD_Bullish_Cross`), and
 * a new one added there must not print a missing translation key into the
 * dialog — the raw name, spaced out, is a worse label but a truthful one.
 */
function strategyName(strategy: string): string {
    const key = `charts.signals.strategies.${strategy}`;
    return te(key) ? t(key) : strategy.replace(/_/gu, ' ');
}
</script>

<template>
    <AppDialog :title="t('charts.signals.title')" size="md" @close="emit('close')">
        <p class="signals__subject">{{ symbol }}</p>

        <p v-if="signals.length === 0" class="signals__empty">{{ t('charts.signals.none') }}</p>

        <ul v-else class="signals__list">
            <li v-for="(signal, index) in signals" :key="index" class="signals__item">
                <div class="signals__head">
                    <span class="signals__direction" :class="`signals__direction--${signal.direction.toLowerCase()}`">
                        {{ t(`charts.signals.${signal.direction.toLowerCase()}`) }}
                    </span>
                    <span class="signals__strategy">{{ strategyName(signal.strategy) }}</span>
                    <span v-if="signal.price !== null" class="signals__price">
                        {{ formatCurrency(signal.price) }}
                    </span>
                </div>

                <p class="signals__description">{{ signal.description }}</p>

                <p class="signals__meta">
                    <span>{{ formatDate(signal.date) }}</span>
                    <span v-if="signal.indicatorValue !== null">
                        {{ t('charts.signals.value') }} {{ formatNumber(signal.indicatorValue) }}
                    </span>
                </p>
            </li>
        </ul>
    </AppDialog>
</template>

<style lang="scss" scoped>
.signals__subject {
    margin: 0 0 $space-2;
    color: $color-text-muted;
    font-size: $font-size-xs;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.signals__empty {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
}

.signals__list {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    margin: 0;
    padding: 0;
    list-style: none;
}

.signals__item {
    padding: $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
}

.signals__head {
    display: flex;
    align-items: baseline;
    gap: $space-2;
}

.signals__direction {
    padding: 0 $space-1;
    border-radius: $radius-sm;
    color: $color-text-inverted;
    font-size: $font-size-xs;
    font-weight: $font-weight-bold;
}

.signals__direction--buy {
    background: $color-positive;
}

.signals__direction--sell {
    background: $color-negative;
}

.signals__strategy {
    font-size: $font-size-sm;
}

.signals__price {
    margin-left: auto;
    font-size: $font-size-sm;
}

.signals__description {
    margin: $space-1 0 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
}

.signals__meta {
    display: flex;
    gap: $space-3;
    margin: $space-1 0 0;
    color: $color-text-muted;
    font-size: $font-size-xs;
}
</style>
