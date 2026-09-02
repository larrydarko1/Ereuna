<script setup lang="ts">
const { title } = defineProps<{ title: string }>();
</script>

<template>
    <section class="panel">
        <h2 class="panel__title">{{ title }}</h2>
        <div class="panel__body">
            <slot />
        </div>
    </section>
</template>

<style lang="scss" scoped>
.panel {
    border-radius: $radius-md;
    background: $color-surface;
}

.panel__title {
    margin: 0;
    padding: $space-2 $space-3;
    border-bottom: $border-width solid $color-elevated;
    color: $color-text-muted;
    font-size: $font-size-xs;
    font-weight: $font-weight-bold;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.panel__body {
    padding: $space-2 $space-3;
}
</style>
