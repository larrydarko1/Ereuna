<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from '@/components/ui/AppDialog.vue';

const {
    title,
    label,
    initial = '',
    maxLength = 60,
    pending = false,
    error = null,
} = defineProps<{
    title: string;
    label: string;
    initial?: string;
    maxLength?: number;
    pending?: boolean;
    error?: string | null;
}>();

const emit = defineEmits<{ submit: [value: string]; close: [] }>();

const { t } = useI18n();

const inputId = useId();
const value = ref(initial);

const trimmed = computed(() => value.value.trim());
const canSubmit = computed(() => trimmed.value !== '' && trimmed.value.length <= maxLength && !pending);
</script>

<template>
    <AppDialog
        :title="title"
        size="sm"
        @close="emit('close')">
        <form
            class="prompt"
            @submit.prevent="canSubmit && emit('submit', trimmed)">
            <label
                class="prompt__label"
                :for="inputId"
                >{{ label }}</label
            >
            <input
                :id="inputId"
                v-model="value"
                class="prompt__input"
                type="text"
                :maxlength="maxLength" />
            <p class="prompt__count">{{ value.length }}/{{ maxLength }}</p>
            <p
                v-if="error !== null"
                class="prompt__error"
                role="alert"
                >{{ error }}</p
            >
        </form>

        <template #footer>
            <button
                type="button"
                class="prompt__cancel"
                @click="emit('close')"
                >{{ t('common.cancel') }}</button
            >
            <button
                type="button"
                class="prompt__submit"
                :disabled="!canSubmit"
                @click="emit('submit', trimmed)">
                {{ t('common.save') }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.prompt {
    display: flex;
    flex-direction: column;
    gap: $space-1;
}

.prompt__label {
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.prompt__input {
    padding: $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-bg;
    color: $color-text;
    font-size: $font-size-sm;
}

.prompt__count {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-xs;
    text-align: end;
}

.prompt__error {
    margin: 0;
    color: $color-negative;
    font-size: $font-size-sm;
}

.prompt__cancel {
    padding: $space-1 $space-3;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-sm;
    cursor: pointer;
}

.prompt__submit {
    padding: $space-1 $space-4;
    border: none;
    border-radius: $radius-sm;
    background: $color-accent-1;
    color: $color-text-inverted;
    font-size: $font-size-sm;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}
</style>
