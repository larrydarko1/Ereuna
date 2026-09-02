<script setup lang="ts">
import { computed, ref } from 'vue';

export type LinePoint = {
    label: string;
    value: number;
};

const {
    points,
    label = '',
    format = (value: number): string => String(value),
} = defineProps<{
    points: readonly LinePoint[];
    label?: string;
    format?: (value: number) => string;
}>();

/** The drawing space. Fixed, because the SVG scales rather than reflows. */
const WIDTH = 1000;
const HEIGHT = 300;
const PADDING = 8;

const hovered = ref<number | null>(null);

/**
 * The path data, or null when there is nothing to draw.
 * A single point has no line, so it is drawn as a flat one across the middle —
 * a portfolio one day old is not an error state.
 */
const shape = computed(() => {
    if (points.length === 0) return null;

    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // A flat series would divide by zero; centring it is the honest picture.
    const span = max - min || 1;
    const usable = HEIGHT - PADDING * 2;

    const coords = points.map((point, index) => ({
        x: points.length === 1 ? WIDTH / 2 : (index / (points.length - 1)) * WIDTH,
        y: PADDING + (1 - (point.value - min) / span) * usable,
    }));

    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first === undefined || last === undefined) return null;

    return {
        line,
        area: `${line} L${last.x.toFixed(2)},${HEIGHT} L${first.x.toFixed(2)},${HEIGHT} Z`,
        coords,
    };
});

const active = computed(() => {
    const index = hovered.value;
    const current = shape.value;
    if (index === null || current === null) return null;
    const coord = current.coords[index];
    const point = points[index];
    if (coord === undefined || point === undefined) return null;
    return { x: coord.x, y: coord.y, point };
});

function onPointerMove(event: PointerEvent): void {
    if (points.length === 0) return;
    const bounds = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    if (bounds.width === 0) return;
    // The pointer is in CSS pixels and the series is in chart units, so the
    // ratio is what maps one to the other — never the pixel offset itself.
    const ratio = (event.clientX - bounds.left) / bounds.width;
    const index = Math.round(ratio * (points.length - 1));
    hovered.value = Math.min(Math.max(index, 0), points.length - 1);
}
</script>

<template>
    <figure class="line-chart">
        <svg
            class="line-chart__svg"
            :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
            role="img"
            :aria-label="label"
            @pointermove="onPointerMove"
            @pointerleave="hovered = null"
        >
            <template v-if="shape !== null">
                <path class="line-chart__area" :d="shape.area" />
                <path class="line-chart__line" :d="shape.line" />
                <g v-if="active !== null">
                    <line
                        class="line-chart__crosshair"
                        :x1="active.x"
                        :x2="active.x"
                        y1="0"
                        :y2="HEIGHT"
                    />
                    <circle class="line-chart__dot" :cx="active.x" :cy="active.y" :r="6" />
                </g>
            </template>
        </svg>

        <figcaption class="line-chart__readout">
            <template v-if="active !== null">
                <span class="line-chart__readout-label">{{ active.point.label }}</span>
                <span class="line-chart__readout-value">{{ format(active.point.value) }}</span>
            </template>
            <span v-else class="line-chart__readout-label">{{ label }}</span>
        </figcaption>
    </figure>
</template>

<style lang="scss" scoped>
.line-chart {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin: 0;

    &__svg {
        // The viewBox scales uniformly rather than stretching, so the aspect
        // ratio is fixed at 10:3 and a plotted dot stays a circle.
        width: 100%;
        height: auto;
        overflow: visible;
    }

    &__area {
        fill: color-mix(in srgb, $color-accent-1 18%, transparent);
        stroke: none;
    }

    &__line {
        fill: none;
        stroke: $color-accent-1;
        stroke-width: 2;

        // The viewBox scales with the container, and so would the stroke —
        // this keeps the line the same weight on a phone and on a wide monitor.
        vector-effect: non-scaling-stroke;
        stroke-linejoin: round;
        stroke-linecap: round;
    }

    &__crosshair {
        stroke: $color-text-muted;
        stroke-width: 1;
        stroke-dasharray: 3 3;
        vector-effect: non-scaling-stroke;
    }

    &__dot {
        fill: $color-accent-1;
        stroke: $color-surface;
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
    }

    &__readout {
        display: flex;
        justify-content: space-between;
        gap: 1em;
        font-size: $font-size-xs;
        color: $color-text-muted;
    }

    &__readout-value {
        font-family: $font-mono;
        color: $color-text;
    }
}
</style>
