<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { label = undefined, size = 'md' } = defineProps<{
    label?: string;
    size?: 'sm' | 'md' | 'lg';
}>();

const { t } = useI18n();
</script>

<template>
    <div
        class="spinner"
        :class="`spinner--${size}`"
        role="status">
        <svg
            class="spinner__ring"
            viewBox="0 0 50 50"
            aria-hidden="true"
            focusable="false">
            <circle
                class="spinner__path"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke-width="5" />
        </svg>
        <span class="visually-hidden">{{ label ?? t('common.loading') }}</span>
    </div>
</template>

<style lang="scss" scoped>
.spinner {
    display: flex;
    align-items: center;
    justify-content: center;
}

.spinner--sm .spinner__ring {
    width: 18px;
    height: 18px;
}

.spinner--md .spinner__ring {
    width: 32px;
    height: 32px;
}

.spinner--lg .spinner__ring {
    width: 50px;
    height: 50px;
}

.spinner__ring {
    animation: spin 2s linear infinite;
}

.spinner__path {
    stroke: $color-accent-1;
    stroke-linecap: round;
    animation: spinner-dash 1.5s ease-in-out infinite;
}

@keyframes spinner-dash {
    0% {
        stroke-dasharray: 1, 150;
        stroke-dashoffset: 0;
    }

    50% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -35;
    }

    100% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -124;
    }
}
</style>
