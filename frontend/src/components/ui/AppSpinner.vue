<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { label = null, size = 'md' } = defineProps<{
    label?: string | null;
    size?: 'sm' | 'md' | 'lg';
}>();

const { t } = useI18n();
</script>

<template>
    <div
        class="spinner"
        :class="`spinner--${size}`"
        role="status">
        <span
            class="spinner__ring"
            aria-hidden="true" />
        <span class="visually-hidden">{{ label ?? t('common.loading') }}</span>
    </div>
</template>

<style lang="scss" scoped>
/* –––––– Layout –––––– */
.spinner {
    display: flex;
    align-items: center;
    justify-content: center;
}

/* –––––– Ring –––––– */
.spinner__ring {
    border: 3px solid $color-elevated;
    border-top-color: $color-accent-1;
    border-radius: $radius-pill;
    animation: spin 0.8s linear infinite;
}

/* –––––– Sizes –––––– */
.spinner--sm .spinner__ring {
    width: 18px;
    height: 18px;
    border-width: 2px;
}

.spinner--md .spinner__ring {
    width: 32px;
    height: 32px;
}

.spinner--lg .spinner__ring {
    width: 50px;
    height: 50px;
    border-width: 5px;
}
</style>
