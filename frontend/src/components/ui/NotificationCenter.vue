<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import IconClose from '@/components/icons/IconClose.vue';
import { useNotifications } from '@/composables/ui/useNotifications';

const { t } = useI18n();
const { notifications, dismiss, pause, resume } = useNotifications();
</script>

<template>
    <section
        class="notification-center"
        :aria-label="t('common.notifications')">
        <TransitionGroup
            name="notification"
            tag="ul"
            class="notification-center__list">
            <li
                v-for="notification in notifications"
                :key="notification.id"
                class="notification"
                role="alert"
                @mouseenter="pause"
                @mouseleave="resume"
                @focusin="pause"
                @focusout="resume">
                <p class="notification__message">{{ notification.message }}</p>
                <button
                    type="button"
                    class="notification__dismiss"
                    :title="t('common.dismiss')"
                    :aria-label="t('common.dismiss')"
                    @click="dismiss(notification.id)">
                    <IconClose class="notification__icon" />
                </button>
            </li>
        </TransitionGroup>
    </section>
</template>

<style scoped lang="scss">
.notification-center {
    position: fixed;
    right: $space-4;
    bottom: $space-4;
    z-index: $z-toast;
    pointer-events: none;
}

.notification-center__list {
    display: grid;
    gap: $space-2;
    margin: 0;
    padding: 0;
    list-style: none;
}

.notification {
    display: flex;
    gap: $space-2;
    align-items: flex-start;
    width: 352px;
    max-width: calc(100vw - 2 * #{$space-4});
    padding: $space-2 $space-2 $space-2 $space-3;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;
    box-shadow: $shadow-md;
    color: $color-text;
    font-size: $font-size-sm;
    pointer-events: auto;
}

.notification__message {
    flex: 1;
    margin: 0;
    padding-top: $space-1;
    line-height: $line-height-body;
    overflow-wrap: anywhere;
}

.notification__dismiss {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    padding: $space-1;
    border: none;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-muted;
    cursor: pointer;

    &:hover {
        background: $color-elevated;
        color: $color-text;
    }
}

.notification__icon {
    width: 14px;
    height: 14px;
}

.notification-enter-active,
.notification-leave-active {
    transition:
        opacity $duration-base $ease-out,
        transform $duration-base $ease-out;
}

.notification-enter-from,
.notification-leave-to {
    opacity: 0;
    transform: translateY($space-2);
}
</style>
