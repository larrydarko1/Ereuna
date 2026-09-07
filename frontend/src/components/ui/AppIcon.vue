<script setup lang="ts">
import { computed } from 'vue';
import { ICON_CIRCLES, ICON_PATHS, type IconName } from '@/constants/icons';

const {
    name,
    size = 16,
    label = null,
} = defineProps<{
    name: IconName;
    size?: number;
    label?: string | null; // Set only when the icon is the whole control; otherwise it is decorative
}>();

const path = computed(() => ICON_PATHS[name]);
const circle = computed(() => ICON_CIRCLES[name] ?? null);
</script>

<template>
    <svg
        class="icon"
        :data-icon="name"
        :width="size"
        :height="size"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        :role="label === null ? undefined : 'img'"
        :aria-label="label ?? undefined"
        :aria-hidden="label === null ? 'true' : undefined">
        <path :d="path" />
        <circle
            v-if="circle !== null"
            :cx="circle.cx"
            :cy="circle.cy"
            :r="circle.r" />
    </svg>
</template>

<style lang="scss" scoped>
.icon {
    display: block;
    flex: none;
}
</style>
