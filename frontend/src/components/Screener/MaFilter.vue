<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { directions, targets, value = null, busy = false } = defineProps<{
    directions: readonly string[];
    targets: readonly string[];
    value?: { direction: string; target: string } | null;
    busy?: boolean;
}>();

const emit = defineEmits<{ apply: [{ direction: string; target: string }] }>();

const { t } = useI18n();

const direction = ref(directions[0] ?? 'abv');
const target = ref(targets[0] ?? 'price');

watch(
    () => value,
    (current) => {
        direction.value = current?.direction ?? directions[0] ?? 'abv';
        target.value = current?.target ?? targets[0] ?? 'price';
    },
    { immediate: true },
);

function targetLabel(option: string): string {
    return option === 'price' ? t('screener.maPrice') : t('screener.maDays', { days: option });
}
</script>

<template>
    <div class="ma-filter">
        <label class="ma-filter__field">
            <span class="ma-filter__label">{{ t('screener.relation') }}</span>
            <select v-model="direction" class="ma-filter__select">
                <option v-for="option in directions" :key="option" :value="option">
                    {{ t(`screener.direction.${option}`) }}
                </option>
            </select>
        </label>

        <label class="ma-filter__field">
            <span class="ma-filter__label">{{ t('screener.compareTo') }}</span>
            <select v-model="target" class="ma-filter__select">
                <option v-for="option in targets" :key="option" :value="option">{{ targetLabel(option) }}</option>
            </select>
        </label>

        <button
            type="button"
            class="ma-filter__apply"
            :disabled="busy"
            @click="emit('apply', { direction, target })"
        >
            {{ t('common.apply') }}
        </button>
    </div>
</template>

<style lang="scss" scoped>
.ma-filter {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: $space-2;
    align-items: end;
}

.ma-filter__field {
    display: flex;
    flex-direction: column;
    gap: $space-1;
    min-width: 0;
}

.ma-filter__label {
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.ma-filter__select {
    width: 100%;
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-sunken;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-sm;
}

.ma-filter__apply {
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
</style>
