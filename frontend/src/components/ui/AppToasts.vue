<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useNotifications, useNotificationCleanup } from '@/composables/ui/useNotifications';

const { t } = useI18n();
const { toasts, dismiss } = useNotifications();

useNotificationCleanup();
</script>

<template>
    <div
        class="toasts"
        role="region"
        :aria-label="t('common.notifications')">
        <TransitionGroup name="toast">
            <div
                v-for="toast in toasts"
                :key="toast.id"
                class="toast"
                :class="`toast--${toast.tone}`"
                :role="toast.tone === 'error' ? 'alert' : 'status'"
                :aria-live="toast.tone === 'error' ? 'assertive' : 'polite'">
                <p class="toast__message">{{ toast.message }}</p>
                <button
                    type="button"
                    class="toast__dismiss"
                    :aria-label="t('common.close')"
                    @click="dismiss(toast.id)">
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        focusable="false">
                        <path
                            d="M6 6 18 18M18 6 6 18"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round" />
                    </svg>
                </button>
            </div>
        </TransitionGroup>
    </div>
</template>

<style lang="scss" scoped>
.toasts {
    position: fixed;
    inset-block-start: $space-4;

    // Logical, not `right`: in the RTL locales the stack belongs on the left.
    inset-inline-end: $space-4;
    z-index: $z-toast;
    display: flex;
    flex-direction: column;
    gap: $space-2;

    // The region spans the corner but must not swallow clicks on the page
    // underneath it; the toasts themselves opt back in.
    pointer-events: none;
    max-width: min(90vw, 380px);
}

.toast {
    display: flex;
    align-items: flex-start;
    gap: $space-3;
    padding: $space-3 $space-4;
    border-radius: $radius-md;
    border-inline-start: 3px solid $color-accent-1;
    background: $color-elevated;
    color: $color-text;
    box-shadow: $shadow-lg;
    pointer-events: auto;
}

.toast--success {
    border-inline-start-color: $color-positive;
}

.toast--error {
    border-inline-start-color: $color-negative;
}

.toast__message {
    margin: 0;
    font-size: $font-size-sm;
    line-height: $line-height-body;
}

.toast__dismiss {
    flex-shrink: 0;
    padding: 0;
    border: none;
    background: none;
    color: $color-text-muted;
    line-height: 0;

    &:hover {
        color: $color-text;
    }

    svg {
        width: 14px;
        height: 14px;
    }
}

.toast-enter-active,
.toast-leave-active {
    transition:
        opacity $duration-fast $ease-out,
        transform $duration-fast $ease-out;
}

.toast-enter-from,
.toast-leave-to {
    opacity: 0;
    transform: translateX(12px);
}

// Leaving items are taken out of flow so the survivors close the gap smoothly
// instead of jumping.
.toast-leave-active {
    position: absolute;
}
</style>
