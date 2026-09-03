<script setup lang="ts">
const { description = null } = defineProps<{
    title: string;
    description?: string | null;
}>();
</script>

<template>
    <section class="setting">
        <h2 class="setting__title">{{ title }}</h2>
        <p v-if="description !== null" class="setting__description">{{ description }}</p>
        <div class="setting__body">
            <slot />
        </div>
    </section>
</template>

<style lang="scss" scoped>
.setting {
    padding: $space-4;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;
}

.setting__title {
    margin: 0;
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    color: $color-text;
}

.setting__description {
    margin: $space-1 0 0;
    font-size: $font-size-sm;
    line-height: $line-height-body;
    color: $color-text-muted;
}

.setting__body {
    display: grid;
    gap: $space-3;
    margin-top: $space-4;
    max-width: 512px;
}
</style>
