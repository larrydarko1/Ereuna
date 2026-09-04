<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, useId, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';

const {
    title,
    size = 'md',
    dismissible = true,
} = defineProps<{
    title: string;
    size?: 'sm' | 'md' | 'lg';
    dismissible?: boolean; // Whether a click on the backdrop closes. Escape always does.
}>();

const emit = defineEmits<{ close: [] }>();

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const { t } = useI18n();

const panel = useTemplateRef<HTMLElement>('panel');
const titleId = useId();
const previouslyFocused = ref<HTMLElement | null>(null);

function focusable(): HTMLElement[] {
    if (panel.value === null) return [];
    return [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.offsetParent !== null);
}

/**
 * Keep Tab inside the dialog.
 * Without this, tabbing past the last control lands on the page behind — which
 * is still there, still clickable, and now has the focus ring.
 */
function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
        emit('close');
        return;
    }
    if (event.key !== 'Tab') return;

    const elements = focusable();
    if (elements.length === 0) {
        event.preventDefault();
        return;
    }

    // Not `.at(-1)`: the browsers this targets predate it.
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (first === undefined || last === undefined) return;

    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panel.value)) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
    }
}

function onBackdrop(event: MouseEvent): void {
    if (dismissible && event.target === event.currentTarget) emit('close');
}

onMounted(async () => {
    previouslyFocused.value = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.addEventListener('keydown', onKeydown);
    document.body.style.overflow = 'hidden';

    await nextTick();
    // The panel itself is the fallback target so focus is inside the dialog even
    // when it holds nothing focusable — a confirmation with only static text.
    (focusable()[0] ?? panel.value)?.focus();
});

onUnmounted(() => {
    document.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
    // Back where it came from, so closing a dialog opened from a row leaves the
    // keyboard on that row rather than at the top of the document.
    previouslyFocused.value?.focus();
});
</script>

<template>
    <Teleport to="body">
        <div
            class="dialog"
            @mousedown="onBackdrop">
            <div
                ref="panel"
                class="dialog__panel"
                :class="`dialog__panel--${size}`"
                role="dialog"
                aria-modal="true"
                :aria-labelledby="titleId"
                tabindex="-1">
                <header class="dialog__header">
                    <h2
                        :id="titleId"
                        class="dialog__title"
                        >{{ title }}</h2
                    >
                    <button
                        type="button"
                        class="dialog__close"
                        :aria-label="t('common.close')"
                        @click="emit('close')">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </header>

                <div class="dialog__body">
                    <slot />
                </div>

                <footer
                    v-if="$slots.footer"
                    class="dialog__footer">
                    <slot name="footer" />
                </footer>
            </div>
        </div>
    </Teleport>
</template>

<style lang="scss" scoped>
.dialog {
    position: fixed;
    inset: 0;
    z-index: $z-modal;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: $space-4;
    background: rgb(0 0 0 / 55%);

    // A dialog that fills the bottom of a phone is reachable with a thumb; the
    // same dialog centred on a desktop is not a sheet.
    @include above($bp-sm) {
        align-items: center;
    }
}

.dialog__panel {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 85vh;
    border-radius: $radius-lg;
    background: $color-surface;
    box-shadow: $shadow-lg;

    &:focus {
        outline: none;
    }
}

.dialog__panel--sm {
    max-width: 384px;
}

.dialog__panel--md {
    max-width: 544px;
}

.dialog__panel--lg {
    max-width: 832px;
}

.dialog__header {
    display: flex;
    gap: $space-3;
    align-items: center;
    justify-content: space-between;
    padding: $space-4;
    border-bottom: $border-width solid $color-elevated;
}

.dialog__title {
    margin: 0;
    font-size: $font-size-md;
    font-weight: $font-weight-bold;
    color: $color-text;
}

.dialog__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-lg;
    line-height: 1;
    cursor: pointer;

    &:hover {
        background: $color-elevated;
        color: $color-text;
    }
}

.dialog__body {
    flex: 1;
    padding: $space-4;
    overflow-y: auto;
    color: $color-text;
}

.dialog__footer {
    display: flex;
    gap: $space-2;
    justify-content: flex-end;
    padding: $space-4;
    border-top: $border-width solid $color-elevated;
}
</style>
