<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { LIST_MODES, type ListMode } from '@/constants/screener';

const { total, exporting = false } = defineProps<{
    total: number;
    exportLimit: number;
    exporting?: boolean;
}>();

const emit = defineEmits<{
    columns: [];
    export: [];
}>();

const mode = defineModel<ListMode>('mode', { required: true });
const autoplay = defineModel<boolean>('autoplay', { required: true });

const { t } = useI18n();
</script>

<template>
    <header class="toolbar">
        <!-- Which list the table is showing: this screener, all of them, or the hidden set -->
        <div
            class="toolbar__modes"
            role="group"
            :aria-label="t('screener.results')">
            <button
                v-for="option in LIST_MODES"
                :key="option"
                type="button"
                class="toolbar__mode"
                :class="{ 'toolbar__mode--active': mode === option }"
                :aria-pressed="mode === option"
                @click="mode = option">
                {{ t(`screener.modes.${option}`) }}
            </button>
        </div>

        <span class="toolbar__count">{{ t('screener.resultsCount', { count: total }) }}</span>

        <button
            type="button"
            class="toolbar__action"
            @click="emit('columns')">
            {{ t('screener.columnsTitle') }}
        </button>
        <button
            type="button"
            class="toolbar__action"
            :disabled="exporting || total === 0"
            :title="t('screener.exportHint', { max: exportLimit })"
            @click="emit('export')">
            {{ exporting ? t('screener.downloading') : t('common.download') }}
        </button>
        <button
            type="button"
            class="toolbar__action"
            :class="{ 'toolbar__action--active': autoplay }"
            :aria-pressed="autoplay"
            @click="autoplay = !autoplay">
            {{ t('screener.autoplay') }}
        </button>
    </header>
</template>

<style lang="scss" scoped>
/* –––––– Bar –––––– */

.toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
    align-items: center;
    padding: $space-2;
    border-bottom: $border-width solid $color-elevated;
}

/* –––––– Mode switch –––––– */

.toolbar__modes {
    display: flex;
    gap: $space-1;
}

.toolbar__mode {
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-surface;
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.toolbar__mode--active {
    background: $color-elevated;
    color: $color-text;
}

/* –––––– Count and actions –––––– */

.toolbar__count {
    margin-right: auto;
    color: $color-text-muted;
    font-size: $font-size-xs;
    font-variant-numeric: tabular-nums;
}

.toolbar__action {
    padding: $space-1 $space-3;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-surface;
    color: $color-text;
    font-size: $font-size-xs;

    &:hover:not(:disabled) {
        background: $color-elevated;
    }

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
}

.toolbar__action--active {
    background: $color-elevated;
}
</style>
