<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ScreenerSummary } from '@/api/screener';

const { items, includedCount = 0, busy = false } = defineProps<{
    items: readonly ScreenerSummary[];
    includedCount?: number;
    busy?: boolean;
}>();

const emit = defineEmits<{
    create: [];
    rename: [];
    remove: [];
    reset: [];
    toggleInclude: [include: boolean];
}>();

const selected = defineModel<string>({ required: true });

const { t } = useI18n();

const current = computed(() => items.find((item) => item.name === selected.value) ?? null);
</script>

<template>
    <div class="picker">
        <select v-model="selected" class="picker__select" :aria-label="t('screener.chooseScreener')">
            <option v-if="items.length === 0" value="">{{ t('screener.noScreeners') }}</option>
            <option v-for="item in items" :key="item.id" :value="item.name">
                {{ item.name }} ({{ item.filterCount }})
            </option>
        </select>

        <div class="picker__actions">
            <button type="button" class="picker__button" :disabled="busy" @click="emit('create')">
                {{ t('common.add') }}
            </button>
            <button type="button" class="picker__button" :disabled="busy || current === null" @click="emit('rename')">
                {{ t('common.edit') }}
            </button>
            <button type="button" class="picker__button" :disabled="busy || current === null" @click="emit('reset')">
                {{ t('common.reset') }}
            </button>
            <button
                type="button"
                class="picker__button picker__button--danger"
                :disabled="busy || current === null"
                @click="emit('remove')"
            >
                {{ t('common.delete') }}
            </button>
        </div>

        <label v-if="current !== null" class="picker__include">
            <input
                type="checkbox"
                :checked="current.include"
                :disabled="busy"
                @change="emit('toggleInclude', ($event.target as HTMLInputElement).checked)"
            >
            <span>{{ t('screener.include') }}</span>
        </label>

        <p class="picker__hint">{{ t('screener.includeHint', { count: includedCount }) }}</p>
    </div>
</template>

<style lang="scss" scoped>
.picker {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    padding: $space-3;
    border-bottom: $border-width solid $color-elevated;
}

.picker__select {
    width: 100%;
    padding: $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-sunken;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-sm;
}

.picker__actions {
    display: flex;
    gap: $space-1;
}

.picker__button {
    flex: 1;
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-surface;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-xs;
    cursor: pointer;

    &:hover:not(:disabled) {
        background: $color-elevated;
    }

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
}

.picker__button--danger:hover:not(:disabled) {
    border-color: $color-negative;
    color: $color-negative;
}

.picker__include {
    display: flex;
    gap: $space-2;
    align-items: center;
    font-size: $font-size-sm;
    cursor: pointer;
}

.picker__hint {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-xs;
}
</style>
