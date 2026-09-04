<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { toDateInput } from '@/utils/formatters';

const {
    value = null,
    bounds = null,
    busy = false,
} = defineProps<{
    value?: { from: string; to: string } | null;
    bounds?: { min: string; max: string } | null;
    busy?: boolean;
}>();

const emit = defineEmits<{ apply: [{ from?: string; to?: string }] }>();

const { t } = useI18n();

const from = ref('');
const to = ref('');
const error = ref<string | null>(null);

function submit(): void {
    const start = from.value.trim();
    const end = to.value.trim();

    if (start === '' && end === '') {
        error.value = t('screener.errorDate');
        return;
    }
    if (start !== '' && end !== '' && start >= end) {
        error.value = t('screener.errorMinMax');
        return;
    }

    error.value = null;
    emit('apply', { from: start === '' ? undefined : start, to: end === '' ? undefined : end });
}

watch(
    () => value,
    (current) => {
        from.value = current === null ? '' : toDateInput(current.from);
        to.value = current === null ? '' : toDateInput(current.to);
        error.value = null;
    },
    { immediate: true },
);
</script>

<template>
    <form
        class="date-filter"
        @submit.prevent="submit">
        <label class="date-filter__field">
            <span class="date-filter__label">{{ t('screener.from') }}</span>
            <input
                v-model="from"
                type="date"
                class="date-filter__input"
                :min="bounds?.min.slice(0, 10)"
                :max="bounds?.max.slice(0, 10)" />
        </label>

        <label class="date-filter__field">
            <span class="date-filter__label">{{ t('screener.to') }}</span>
            <input
                v-model="to"
                type="date"
                class="date-filter__input"
                :min="bounds?.min.slice(0, 10)"
                :max="bounds?.max.slice(0, 10)" />
        </label>

        <button
            type="submit"
            class="date-filter__apply"
            :disabled="busy"
            >{{ t('common.apply') }}</button
        >

        <p
            v-if="error !== null"
            class="date-filter__error"
            role="alert"
            >{{ error }}</p
        >
    </form>
</template>

<style lang="scss" scoped>
.date-filter {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: $space-2;
    align-items: end;
}

.date-filter__field {
    display: flex;
    flex-direction: column;
    gap: $space-1;
    min-width: 0;
}

.date-filter__label {
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.date-filter__input {
    width: 100%;
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-sunken;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-sm;
}

.date-filter__apply {
    padding: $space-1 $space-3;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-elevated;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-sm;
    cursor: pointer;

    &:disabled {
        opacity: 0.6;
        cursor: default;
    }
}

.date-filter__error {
    grid-column: 1 / -1;
    margin: 0;
    color: $color-negative;
    font-size: $font-size-xs;
}
</style>
