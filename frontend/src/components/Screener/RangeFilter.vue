<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatNumber } from '@/utils/formatters';

const { value = null, bounds = null, busy = false } = defineProps<{
    value?: { min: number; max: number } | null;
    bounds?: { min: number; max: number } | null;
    busy?: boolean;
}>();

const emit = defineEmits<{ apply: [{ min?: number; max?: number }] }>();

const { t } = useI18n();

const min = ref('');
const max = ref('');
const error = ref<string | null>(null);

/** A blank field means "no limit on this side", not zero. */
function parse(raw: string): number | undefined {
    const trimmed = raw.trim();
    if (trimmed === '') return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function submit(): void {
    const low = parse(min.value);
    const high = parse(max.value);

    if (Number.isNaN(low) || Number.isNaN(high)) {
        error.value = t('screener.errorNumber');
        return;
    }
    if (low === undefined && high === undefined) {
        error.value = t('screener.errorNumber');
        return;
    }
    if (low !== undefined && high !== undefined && low >= high) {
        error.value = t('screener.errorMinMax');
        return;
    }

    error.value = null;
    emit('apply', { min: low, max: high });
}

function placeholder(side: 'min' | 'max'): string {
    if (bounds === null) return side === 'min' ? t('screener.min') : t('screener.max');
    return formatNumber(side === 'min' ? bounds.min : bounds.max, 2);
}

watch(
    () => value,
    (current) => {
        min.value = current === null ? '' : String(current.min);
        max.value = current === null ? '' : String(current.max);
        error.value = null;
    },
    { immediate: true },
);
</script>

<template>
    <form class="range-filter" @submit.prevent="submit">
        <label class="range-filter__field">
            <span class="range-filter__label">{{ t('screener.min') }}</span>
            <input v-model="min" type="number" step="any" class="range-filter__input" :placeholder="placeholder('min')">
        </label>

        <label class="range-filter__field">
            <span class="range-filter__label">{{ t('screener.max') }}</span>
            <input v-model="max" type="number" step="any" class="range-filter__input" :placeholder="placeholder('max')">
        </label>

        <button type="submit" class="range-filter__apply" :disabled="busy">{{ t('common.apply') }}</button>

        <p v-if="error !== null" class="range-filter__error" role="alert">{{ error }}</p>
    </form>
</template>

<style lang="scss" scoped>
.range-filter {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: $space-2;
    align-items: end;
}

.range-filter__field {
    display: flex;
    flex-direction: column;
    gap: $space-1;
    min-width: 0;
}

.range-filter__label {
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.range-filter__input {
    width: 100%;
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-sunken;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-sm;
}

.range-filter__apply {
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

.range-filter__error {
    grid-column: 1 / -1;
    margin: 0;
    color: $color-negative;
    font-size: $font-size-xs;
}
</style>
