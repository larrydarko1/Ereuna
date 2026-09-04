<script setup lang="ts">
import { computed, useId } from 'vue';

const {
    label,
    type = 'text',
    autocomplete = undefined,
    error = null,
    placeholder = undefined,
    autofocus = false,
} = defineProps<{
    label: string;
    type?: 'text' | 'email';
    autocomplete?: string;
    error?: string | null;
    placeholder?: string;
    autofocus?: boolean;
}>();

const model = defineModel<string>({ required: true });

const id = useId();
const errorId = computed(() => `${id}-error`);
</script>

<template>
    <div class="field">
        <label
            class="field__label"
            :for="id"
            >{{ label }}</label
        >
        <input
            :id="id"
            v-model="model"
            class="field__input"
            :class="{ 'field__input--invalid': error !== null }"
            :type="type"
            :autocomplete="autocomplete"
            :placeholder="placeholder"
            :autofocus="autofocus"
            :aria-invalid="error !== null"
            :aria-describedby="error !== null ? errorId : undefined" />
        <p
            v-if="error !== null"
            :id="errorId"
            class="field__error"
            >{{ error }}</p
        >
    </div>
</template>

<style lang="scss" scoped>
.field {
    display: flex;
    flex-direction: column;
    gap: $space-1;
}

.field__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text-muted;
}

.field__input {
    width: 100%;
    padding: $space-3;
    border: $border-width solid $color-sunken;
    border-radius: $radius-md;
    background: $color-surface;
    color: $color-text;
    font-size: $font-size-base;

    &::placeholder {
        color: $color-text-muted;
    }

    &:focus {
        border-color: $color-accent-1;
    }
}

.field__input--invalid {
    border-color: $color-negative;
}

.field__error {
    margin: 0;
    font-size: $font-size-xs;
    color: $color-negative;
}
</style>
