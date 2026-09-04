<script setup lang="ts">
const { width = 250, label = 'Ereuna' } = defineProps<{
    width?: number;
    label?: string;
}>();
</script>

<template>
    <span
        class="logo"
        :style="{ width: `${width}px` }"
        :role="label === '' ? undefined : 'img'"
        :aria-label="label === '' ? undefined : label"
        :aria-hidden="label === '' ? 'true' : undefined" />
</template>

<style lang="scss" scoped>
.logo {
    display: block;

    // The artwork is 1280×720; the box has to keep that ratio or the mask crops.
    aspect-ratio: 1280 / 720;
    background: currentcolor;
    mask: url('/logo.svg') no-repeat center / contain;
}
</style>
