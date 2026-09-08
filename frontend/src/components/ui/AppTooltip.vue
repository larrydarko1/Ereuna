<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, useId, useTemplateRef } from 'vue';

// Teleported to the body rather than drawn in place: the tables that want a
// tooltip scroll horizontally inside a clipped column, and a bubble rendered
// inside that column is cut off at its edge.

/** Kept clear of the viewport edges, so a bubble beside one is never half off it. */
const MARGIN = 8;

const anchor = useTemplateRef<HTMLElement>('anchor');
const bubble = useTemplateRef<HTMLElement>('bubble');

const id = useId();
const open = ref(false);
const placed = ref(false);
const left = ref(0);
const top = ref(0);

async function show(): Promise<void> {
    open.value = true;
    await nextTick();
    place();
    placed.value = true;
}

function hide(): void {
    open.value = false;
    placed.value = false;
}

/**
 * Fixed coordinates, measured once the bubble has a size.
 * Centred on the trigger, then pulled back inside the viewport on whichever
 * edge it would have crossed, and flipped above the trigger when the space
 * below it is not enough.
 */
function place(): void {
    const trigger = anchor.value?.getBoundingClientRect();
    const box = bubble.value?.getBoundingClientRect();
    if (trigger === undefined || box === undefined) return;

    const half = box.width / 2;
    const centre = trigger.left + trigger.width / 2;
    const room = window.innerHeight - trigger.bottom;

    left.value = Math.min(Math.max(centre, MARGIN + half), window.innerWidth - MARGIN - half);
    top.value = room < box.height + MARGIN ? trigger.top - box.height - MARGIN : trigger.bottom + MARGIN;
}

// A bubble positioned against the viewport goes stale the moment anything
// scrolls under it, so it closes rather than drifting away from its trigger.
onMounted(() => {
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
});

onUnmounted(() => {
    window.removeEventListener('scroll', hide, true);
    window.removeEventListener('resize', hide);
});
</script>

<template>
    <button
        ref="anchor"
        type="button"
        class="app-tooltip"
        :aria-describedby="open ? id : undefined"
        @mouseenter="show"
        @mouseleave="hide"
        @focus="show"
        @blur="hide"
        @keydown.escape="hide">
        <slot />

        <Teleport to="body">
            <span
                v-if="open"
                :id="id"
                ref="bubble"
                class="app-tooltip__bubble"
                :class="{ 'app-tooltip__bubble--placed': placed }"
                role="tooltip"
                :style="{ left: `${left}px`, top: `${top}px` }">
                <slot name="content" />
            </span>
        </Teleport>
    </button>
</template>

<style lang="scss" scoped>
/* –––––– Trigger –––––– */

// A button rather than a bare span: the content it explains has to be reachable
// by keyboard, and only a focusable control can carry `aria-describedby`
// somewhere a screen reader will read it out.
.app-tooltip {
    display: inline-flex;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    cursor: help;

    &:focus-visible {
        outline: 2px solid $color-accent-1;
        outline-offset: 2px;
    }
}

/* –––––– Bubble –––––– */

.app-tooltip__bubble {
    position: fixed;
    z-index: $z-toast;
    display: block;
    max-width: 280px;
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-surface;
    box-shadow: $shadow-md;
    color: $color-text;
    font-size: $font-size-xs;
    white-space: pre-line;
    pointer-events: none;
    opacity: 0;
    transform: translateX(-50%);
}

// Only once `place` has measured it: until then it sits at the origin, and a
// visible bubble there is a flash in the corner of the screen.
.app-tooltip__bubble--placed {
    opacity: 1;
}
</style>
