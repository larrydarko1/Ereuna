<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';

const {
    label,
    autocomplete = 'current-password',
    error = null,
    placeholder = undefined,
} = defineProps<{
    label: string;
    autocomplete?: 'current-password' | 'new-password';
    error?: string | null;
    placeholder?: string;
}>();

const model = defineModel<string>({ required: true });

const { t } = useI18n();
const revealed = ref(false);
const id = useId();
const errorId = computed(() => `${id}-error`);
</script>

<template>
    <div class="field">
        <label class="field__label" :for="id">{{ label }}</label>
        <div class="field__control">
            <input
                :id="id"
                v-model="model"
                class="field__input"
                :class="{ 'field__input--invalid': error !== null }"
                :type="revealed ? 'text' : 'password'"
                :autocomplete="autocomplete"
                :placeholder="placeholder"
                :aria-invalid="error !== null"
                :aria-describedby="error !== null ? errorId : undefined"
            />
            <button
                type="button"
                class="field__reveal"
                :aria-label="revealed ? t('auth.hidePassword') : t('auth.showPassword')"
                :aria-pressed="revealed"
                @click="revealed = !revealed"
            >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                    <path
                        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
                        stroke="currentColor"
                        stroke-width="2"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
                    <path v-if="revealed" d="M4 20 20 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
            </button>
        </div>
        <p v-if="error !== null" :id="errorId" class="field__error">{{ error }}</p>
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

.field__control {
    position: relative;
    display: flex;
    align-items: center;
}

.field__input {
    width: 100%;
    padding: $space-3;

    // Room for the reveal button, which sits inside the field.
    padding-inline-end: $space-7;
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

.field__reveal {
    position: absolute;
    inset-inline-end: $space-2;
    display: flex;
    padding: $space-1;
    border: none;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-muted;

    &:hover {
        color: $color-text;
    }

    svg {
        width: 18px;
        height: 18px;
    }
}

.field__error {
    margin: 0;
    font-size: $font-size-xs;
    color: $color-negative;
}
</style>
