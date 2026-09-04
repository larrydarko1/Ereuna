<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { BreadthSplit } from '@ereuna/shared';
import { formatNumber } from '@/utils/formatters';

type Meter = {
    key: string;
    positive: number;
    negative: number;
    neutral: number;
};

const { breadth } = defineProps<{ breadth: BreadthSplit }>();

const { t } = useI18n();

/**
 * Both readings are three-way splits of the same universe, so they render as
 * one bar each rather than as two numbers: the middle band is the answer that
 * matters most on a quiet day and a pair of figures hides it.
 */
const meters = computed<Meter[]>(() => [
    {
        key: 'advanceDecline',
        positive: breadth.advancing,
        negative: breadth.declining,
        neutral: breadth.unchanged,
    },
    {
        key: 'newHighsLows',
        positive: breadth.newHighs,
        negative: breadth.newLows,
        neutral: breadth.neutral,
    },
]);

function percent(value: number): string {
    return formatNumber(value * 100, 1);
}
</script>

<template>
    <ul class="breadth">
        <li
            v-for="meter in meters"
            :key="meter.key"
            class="breadth__item">
            <span class="breadth__label">{{ t(`dashboard.breadth.${meter.key}`) }}</span>

            <span
                class="breadth__bar"
                role="img"
                :aria-label="
                    t(`dashboard.breadth.${meter.key}Reading`, {
                        positive: percent(meter.positive),
                        negative: percent(meter.negative),
                        neutral: percent(meter.neutral),
                    })
                ">
                <span
                    class="breadth__fill breadth__fill--positive"
                    :style="{ width: `${meter.positive * 100}%` }" />
                <span
                    class="breadth__fill breadth__fill--neutral"
                    :style="{ width: `${meter.neutral * 100}%` }" />
                <span
                    class="breadth__fill breadth__fill--negative"
                    :style="{ width: `${meter.negative * 100}%` }" />
            </span>

            <span class="breadth__values">
                <span class="breadth__value breadth__value--positive">{{ percent(meter.positive) }}%</span>
                <span class="breadth__value">{{ percent(meter.neutral) }}%</span>
                <span class="breadth__value breadth__value--negative">{{ percent(meter.negative) }}%</span>
            </span>
        </li>
    </ul>
</template>

<style lang="scss" scoped>
.breadth {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin: 0;
    padding: 0;
    list-style: none;
}

.breadth__item {
    display: grid;
    gap: 0.2em;
}

.breadth__label {
    font-size: $font-size-xs;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.breadth__bar {
    display: flex;
    overflow: hidden;
    width: 100%;
    height: 8px;
    border-radius: $radius-pill;
    background: $color-sunken;
}

.breadth__fill {
    height: 100%;
}

.breadth__fill--positive {
    background: $color-positive;
}

.breadth__fill--neutral {
    background: $color-elevated;
}

.breadth__fill--negative {
    background: $color-negative;
}

.breadth__values {
    display: flex;
    justify-content: space-between;
    font-family: $font-mono;
    font-size: $font-size-xs;
    color: $color-text-muted;
}

.breadth__value--positive {
    color: $color-positive;
}

.breadth__value--negative {
    color: $color-negative;
}
</style>
