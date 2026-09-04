<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSpinner from '@/components/ui/AppSpinner.vue';
import { useEscapeToClose } from '@/composables/ui/useEscapeToClose';

const { pending = false } = defineProps<{ pending?: boolean }>();

const emit = defineEmits<{
    submit: [code: string];
    cancel: [];
}>();

defineExpose({ reset });

const LENGTH = 6;

const { t } = useI18n();
const digits = ref<string[]>(Array.from({ length: LENGTH }, () => ''));
const inputs = ref<HTMLInputElement[]>([]);

function focusAt(index: number): void {
    inputs.value[Math.min(Math.max(index, 0), LENGTH - 1)]?.focus();
}

/**
 * Keep one digit per box and advance.
 * `input` rather than `keydown` so it also covers a phone's numeric keyboard
 * and an autofilled one-time code, neither of which produces key events.
 */
function onInput(index: number, event: Event): void {
    const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    if (raw === '') {
        digits.value[index] = '';
        return;
    }

    // More than one character means a paste or an autofill: spread it forward
    // from here rather than dropping everything but the first digit.
    for (let offset = 0; offset < raw.length && index + offset < LENGTH; offset += 1) {
        digits.value[index + offset] = raw[offset] ?? '';
    }

    const next = Math.min(index + raw.length, LENGTH - 1);
    void nextTick(() => focusAt(next));
    if (digits.value.every((digit) => digit !== '')) submit();
}

function onBackspace(index: number): void {
    // Only step back from an already-empty box, so the first Backspace clears
    // the digit you are looking at instead of the one before it.
    if (digits.value[index] === '' && index > 0) {
        digits.value[index - 1] = '';
        focusAt(index - 1);
    }
}

function submit(): void {
    const code = digits.value.join('');
    if (code.length === LENGTH) emit('submit', code);
}

/** Clear and refocus after a rejected code, so the next attempt starts clean. */
function reset(): void {
    digits.value = Array.from({ length: LENGTH }, () => '');
    void nextTick(() => focusAt(0));
}

useEscapeToClose(() => emit('cancel'));

onMounted(() => {
    void nextTick(() => inputs.value[0]?.focus());
});
</script>

<template>
    <div class="overlay">
        <div
            class="prompt"
            role="dialog"
            aria-modal="true"
            :aria-label="t('auth.twoFactorTitle')"
            aria-describedby="two-factor-hint">
            <h2 class="prompt__title">{{ t('auth.twoFactorTitle') }}</h2>
            <p
                id="two-factor-hint"
                class="prompt__hint"
                >{{ t('auth.twoFactorHint') }}</p
            >

            <div class="prompt__digits">
                <input
                    v-for="(digit, index) in digits"
                    :key="index"
                    ref="inputs"
                    class="prompt__digit"
                    :value="digit"
                    type="text"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    maxlength="6"
                    :aria-label="t('auth.twoFactorDigit', { n: index + 1 })"
                    :disabled="pending"
                    @input="onInput(index, $event)"
                    @keydown.backspace="onBackspace(index)"
                    @keydown.arrow-left.prevent="focusAt(index - 1)"
                    @keydown.arrow-right.prevent="focusAt(index + 1)" />
            </div>

            <div class="prompt__actions">
                <button
                    type="button"
                    class="prompt__cancel"
                    :disabled="pending"
                    @click="emit('cancel')">
                    {{ t('common.cancel') }}
                </button>
                <button
                    type="button"
                    class="prompt__verify"
                    :disabled="pending"
                    @click="submit">
                    <AppSpinner
                        v-if="pending"
                        size="sm"
                        :label="t('common.processing')" />
                    <span v-else>{{ t('auth.twoFactorVerify') }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.overlay {
    position: fixed;
    inset: 0;
    z-index: $z-modal;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: $space-4;
    background: rgb(0 0 0 / 60%);
}

.prompt {
    display: flex;
    flex-direction: column;
    gap: $space-4;
    width: 100%;
    max-width: 420px;
    padding: $space-6;
    border-radius: $radius-lg;
    background: $color-elevated;
    box-shadow: $shadow-lg;
}

.prompt__title {
    margin: 0;
    font-size: $font-size-xl;
}

.prompt__hint {
    margin: 0;
    font-size: $font-size-sm;
    color: $color-text-muted;
}

.prompt__digits {
    display: flex;
    gap: $space-2;
}

.prompt__digit {
    // Equal flex basis rather than a fixed width, so six boxes fit a 320px
    // screen without overflowing.
    flex: 1 1 0;
    min-width: 0;
    padding: $space-3 0;
    border: $border-width solid $color-sunken;
    border-radius: $radius-md;
    background: $color-surface;
    color: $color-text;
    font-family: $font-mono;
    font-size: $font-size-lg;
    text-align: center;

    &:focus {
        border-color: $color-accent-1;
    }
}

.prompt__actions {
    display: flex;
    justify-content: flex-end;
    gap: $space-2;
}

.prompt__cancel,
.prompt__verify {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 96px;
    min-height: 40px;
    padding: $space-2 $space-4;
    border-radius: $radius-md;
    font-size: $font-size-base;
    font-weight: $font-weight-medium;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
}

.prompt__cancel {
    border: $border-width solid $color-sunken;
    background: none;
    color: $color-text-muted;

    &:hover:not(:disabled) {
        color: $color-text;
    }
}

.prompt__verify {
    border: $border-width solid transparent;
    background: $color-accent-1;
    color: $color-text-inverted;
}
</style>
