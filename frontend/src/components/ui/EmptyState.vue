<script setup lang="ts">
const { body = null } = defineProps<{
    title: string;
    body?: string | null;
}>();
</script>

<template>
    <section class="empty-state">
        <h2 class="empty-state__title">{{ title }}</h2>
        <p
            v-if="body !== null"
            class="empty-state__body"
            >{{ body }}</p
        >
        <div
            v-if="$slots.default"
            class="empty-state__actions">
            <slot />
        </div>
    </section>
</template>

<style lang="scss" scoped>
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-2;
    padding: $space-6 $space-4;
    border: $border-width dashed $color-elevated;
    border-radius: $radius-md;
    text-align: center;
}

.empty-state__title {
    margin: 0;
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    color: $color-text;
}

.empty-state__body {
    margin: 0;
    max-width: 42ch;
    font-size: $font-size-sm;
    line-height: $line-height-body;
    color: $color-text-muted;
}

.empty-state__actions {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
    margin-top: $space-2;
}
</style>
