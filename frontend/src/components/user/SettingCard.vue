<script setup lang="ts">
const { description = null, tone = 'default' } = defineProps<{
    title: string;
    description?: string | null;
    tone?: 'default' | 'danger'; // `danger` colours the card for an irreversible action
}>();
</script>

<template>
    <section
        class="setting"
        :class="{ 'setting--danger': tone === 'danger' }">
        <h2 class="setting__title">{{ title }}</h2>
        <p
            v-if="description !== null"
            class="setting__description"
            >{{ description }}</p
        >
        <div class="setting__body">
            <slot />
        </div>
    </section>
</template>

<style lang="scss" scoped>
/* –––––– Card –––––– */

.setting {
    padding: $space-4;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;
}

// A red border and a tinted ground, mixed rather than hard-coded: the negative
// token is a CSS variable at runtime, so it cannot be lightened with an SCSS
// colour function.
.setting--danger {
    border-color: $color-negative;
    background: color-mix(in srgb, $color-negative 6%, $color-surface);

    .setting__title {
        color: $color-negative;
    }
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
