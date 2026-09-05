<script setup lang="ts">
import { computed, ref } from 'vue';

export type Bar = {
    label: string;
    value: number;
    positive?: boolean;
};

const {
    bars,
    label = '',
    marker = null,
    format = (value: number): string => String(value),
} = defineProps<{
    bars: readonly Bar[];
    label?: string;
    marker?: number | null;
    format?: (value: number) => string;
}>();

const WIDTH = 1000;
const HEIGHT = 300;
const PADDING = 8;
const GAP_RATIO = 0.2;

const hovered = ref<number | null>(null);

/** The scale, shared by the bars and the baseline they hang from. */
const scale = computed(() => {
    const values = bars.map((bar) => bar.value);
    // Zero is always in frame: a chart of only-positive bars still has to show
    // where "no change" sits, or a small gain reads as a large one.
    const max = Math.max(0, ...values);
    const min = Math.min(0, ...values);
    // A flat series would divide by zero
    const range = max - min;
    const span = range === 0 ? 1 : range;
    const usable = HEIGHT - PADDING * 2;
    return { span, usable, zero: PADDING + (max / span) * usable };
});

const baseline = computed(() => scale.value.zero);

const shaped = computed(() => {
    if (bars.length === 0) return [];
    const slot = WIDTH / bars.length;
    const width = slot * (1 - GAP_RATIO);
    const { span, usable, zero } = scale.value;

    return bars.map((source, index) => {
        const height = (Math.abs(source.value) / span) * usable;
        return {
            source,
            x: index * slot + (slot - width) / 2,
            // A bar hangs off the baseline: upward for a gain, downward for a
            // loss, which is why the y differs by sign but the height does not.
            y: source.value >= 0 ? zero - height : zero,
            width,
            // Anything non-zero draws something, or a small gain beside one
            // huge bar renders as an empty slot.
            height: source.value === 0 ? 0 : Math.max(height, 1),
        };
    });
});

const markerX = computed(() => {
    if (marker === null || marker < 0 || marker >= bars.length) return null;
    const slot = WIDTH / bars.length;
    return marker * slot + slot / 2;
});

const active = computed(() => (hovered.value === null ? null : (bars[hovered.value] ?? null)));
</script>

<template>
    <figure class="bar-chart">
        <svg
            class="bar-chart__svg"
            :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
            role="img"
            :aria-label="label"
            @pointerleave="hovered = null">
            <line
                class="bar-chart__baseline"
                x1="0"
                :x2="WIDTH"
                :y1="baseline"
                :y2="baseline" />
            <rect
                v-for="(bar, index) in shaped"
                :key="`${bar.source.label}-${index}`"
                class="bar-chart__bar"
                :class="(bar.source.positive ?? bar.source.value >= 0) ? 'bar-chart__bar--up' : 'bar-chart__bar--down'"
                :x="bar.x"
                :y="bar.y"
                :width="bar.width"
                :height="bar.height"
                @pointerenter="hovered = index" />
            <line
                v-if="markerX !== null"
                class="bar-chart__marker"
                :x1="markerX"
                :x2="markerX"
                y1="0"
                :y2="HEIGHT" />
        </svg>

        <figcaption class="bar-chart__readout">
            <template v-if="active !== null">
                <span class="bar-chart__readout-label">{{ active.label }}</span>
                <span class="bar-chart__readout-value">{{ format(active.value) }}</span>
            </template>
            <span
                v-else
                class="bar-chart__readout-label"
                >{{ label }}</span
            >
        </figcaption>
    </figure>
</template>

<style lang="scss" scoped>
.bar-chart {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin: 0;
}

.bar-chart__svg {
    // Scales uniformly rather than stretching, so the gaps stay even.
    width: 100%;
    height: auto;
    overflow: visible;
}

.bar-chart__baseline {
    stroke: $color-elevated;
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
}

.bar-chart__bar {
    transition: opacity $duration-fast $ease-out;

    &:hover {
        opacity: 0.75;
    }

    &--up {
        fill: $color-positive;
    }

    &--down {
        fill: $color-negative;
    }
}

.bar-chart__marker {
    stroke: $color-accent-1;
    stroke-width: 1;
    stroke-dasharray: 4 4;
    vector-effect: non-scaling-stroke;
}

.bar-chart__readout {
    display: flex;
    justify-content: space-between;
    gap: 1em;
    font-size: $font-size-xs;
    color: $color-text-muted;
}

.bar-chart__readout-value {
    font-family: $font-mono;
    color: $color-text;
}
</style>
