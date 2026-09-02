<script setup lang="ts">
import { computed, ref } from 'vue';

export type Slice = {
    label: string;
    value: number;
};

const { slices, label = '' } = defineProps<{
    slices: readonly Slice[];
    label?: string;
}>();

/** A 42-unit box gives a circumference near 100, so a slice's dash length is
 *  its percentage almost exactly. */
const RADIUS = 15.915;
const CIRCUMFERENCE = 100;
const PALETTE_SIZE = 8;

const hovered = ref<number | null>(null);

const shaped = computed(() => {
    const total = slices.reduce((sum, slice) => sum + Math.abs(slice.value), 0);
    if (total === 0) return [];

    let consumed = 0;
    return slices.map((source) => {
        const percent = (Math.abs(source.value) / total) * CIRCUMFERENCE;
        // Dashes run clockwise from 3 o'clock and the offset counts backwards,
        // so each slice starts where the ones before it ended. The extra 25
        // rotates the whole ring to begin at the top.
        const offset = CIRCUMFERENCE - consumed + 25;
        consumed += percent;
        return { source, percent, length: percent, offset };
    });
});
</script>

<template>
    <figure class="donut-chart">
        <svg class="donut-chart__svg" viewBox="0 0 42 42" role="img" :aria-label="label">
            <circle class="donut-chart__track" cx="21" cy="21" :r="RADIUS" />
            <circle
                v-for="(slice, index) in shaped"
                :key="slice.source.label"
                class="donut-chart__slice"
                :class="`donut-chart__slice--${index % PALETTE_SIZE}`"
                cx="21"
                cy="21"
                :r="RADIUS"
                :stroke-dasharray="`${slice.length} ${CIRCUMFERENCE - slice.length}`"
                :stroke-dashoffset="slice.offset"
                @pointerenter="hovered = index"
                @pointerleave="hovered = null"
            />
        </svg>

        <ul class="donut-chart__legend">
            <li
                v-for="(slice, index) in shaped"
                :key="slice.source.label"
                class="donut-chart__legend-item"
                :class="{ 'donut-chart__legend-item--active': hovered === index }"
                @pointerenter="hovered = index"
                @pointerleave="hovered = null"
            >
                <span class="donut-chart__swatch" :class="`donut-chart__swatch--${index % PALETTE_SIZE}`" />
                <span class="donut-chart__legend-label">{{ slice.source.label }}</span>
                <span class="donut-chart__legend-value">{{ slice.percent.toFixed(1) }}%</span>
            </li>
        </ul>
    </figure>
</template>

<style lang="scss" scoped>
@use 'sass:map';

// The eight tokens whose meaning holds across every palette. Allocation has no
// inherent order, so these are read as a categorical set, not a scale.
$slice-colors: (
    0: $color-accent-1,
    1: $color-accent-2,
    2: $color-accent-3,
    3: $color-ma-1,
    4: $color-ma-2,
    5: $color-ma-3,
    6: $color-ma-4,
    7: $color-volume,
);

.donut-chart {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1em;
    margin: 0;

    &__svg {
        width: 160px;
        height: 160px;
        flex-shrink: 0;
    }

    &__track {
        fill: none;
        stroke: $color-sunken;
        stroke-width: 5;
    }

    &__slice {
        fill: none;
        stroke-width: 5;
        transition: stroke-width $duration-fast $ease-out;

        &:hover {
            stroke-width: 6.5;
        }

        @each $index, $color in $slice-colors {
            &--#{$index} {
                stroke: $color;
            }
        }
    }

    &__legend {
        flex: 1 1 12ch;
        min-width: 12ch;
        max-height: 160px;
        overflow-y: auto;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    &__legend-item {
        display: flex;
        align-items: center;
        gap: 0.5em;
        padding: 0.15em 0.25em;
        border-radius: $radius-sm;
        font-size: $font-size-xs;
        color: $color-text-muted;

        &--active {
            background: $color-sunken;
            color: $color-text;
        }
    }

    &__swatch {
        width: 8px;
        height: 8px;
        flex-shrink: 0;
        border-radius: $radius-pill;

        @each $index, $color in $slice-colors {
            &--#{$index} {
                background: $color;
            }
        }
    }

    &__legend-label {
        flex: 1 1 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__legend-value {
        font-family: $font-mono;
        color: $color-text;
    }
}
</style>
