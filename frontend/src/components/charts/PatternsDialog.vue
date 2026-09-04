<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { PatternMatch } from '@/lib/lightweight-charts/pattern-detection';
import AppDialog from '@/components/ui/AppDialog.vue';
import { formatDate, formatNumber } from '@/utils/formatters';

const { symbol, patterns } = defineProps<{
    symbol: string;
    patterns: readonly PatternMatch[];
}>();

const emit = defineEmits<{ close: [] }>();

/** Which way a pattern reads, for the colour it is given. */
const BIAS: Record<string, 'bullish' | 'bearish' | 'neutral'> = {
    doubleTop: 'bearish',
    doubleBottom: 'bullish',
    headAndShoulders: 'bearish',
    inverseHeadAndShoulders: 'bullish',
    ascendingTriangle: 'bullish',
    descendingTriangle: 'bearish',
    symmetricTriangle: 'neutral',
    bullishFlag: 'bullish',
    bearishFlag: 'bearish',
};

const { t, te } = useI18n();

function patternName(type: string): string {
    const key = `charts.patterns.types.${type}`;
    return te(key) ? t(key) : type;
}

function bias(type: string): 'bullish' | 'bearish' | 'neutral' {
    return BIAS[type] ?? 'neutral';
}

/** The detector's times are seconds since the epoch. */
function span(pattern: PatternMatch): string {
    return `${formatDate(new Date(pattern.timeframe.start * 1000))} – ${formatDate(new Date(pattern.timeframe.end * 1000))}`;
}
</script>

<template>
    <AppDialog :title="t('charts.patterns.title')" size="md" @close="emit('close')">
        <p class="patterns__subject">{{ symbol }}</p>

        <template v-if="patterns.length === 0">
            <p class="patterns__empty">{{ t('charts.patterns.none') }}</p>
            <p class="patterns__hint">{{ t('charts.patterns.noneHint') }}</p>
        </template>

        <ul v-else class="patterns__list">
            <li v-for="(pattern, index) in patterns" :key="index" class="patterns__item">
                <div class="patterns__head">
                    <span class="patterns__name" :class="`patterns__name--${bias(pattern.type)}`">
                        {{ patternName(pattern.type) }}
                    </span>
                    <span class="patterns__confidence">
                        {{ t('charts.patterns.confidence') }} {{ formatNumber(pattern.confidence * 100, 0) }}%
                    </span>
                </div>
                <p class="patterns__span">{{ span(pattern) }}</p>
            </li>
        </ul>
    </AppDialog>
</template>

<style lang="scss" scoped>
.patterns__subject {
    margin: 0 0 $space-2;
    color: $color-text-muted;
    font-size: $font-size-xs;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.patterns__empty {
    margin: 0;
    font-size: $font-size-sm;
}

.patterns__hint {
    margin: $space-1 0 0;
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.patterns__list {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    margin: 0;
    padding: 0;
    list-style: none;
}

.patterns__item {
    padding: $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
}

.patterns__head {
    display: flex;
    align-items: baseline;
    gap: $space-2;
    justify-content: space-between;
}

.patterns__name {
    font-size: $font-size-sm;
}

.patterns__name--bullish {
    color: $color-positive;
}

.patterns__name--bearish {
    color: $color-negative;
}

.patterns__confidence,
.patterns__span {
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.patterns__span {
    margin: $space-1 0 0;
}
</style>
