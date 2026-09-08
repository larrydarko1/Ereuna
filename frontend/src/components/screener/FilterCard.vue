<script setup lang="ts">
import { ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '@/components/ui/AppIcon.vue';

const {
    label,
    tip = null,
    summary = null,
    available = true,
    busy = false,
} = defineProps<{
    label: string;
    tip?: string | null; // Explanatory text, where the locale has one for this filter
    summary?: string | null; // What the filter is currently set to, shown collapsed
    available?: boolean; // False when the dataset has nothing to range over yet
    busy?: boolean;
}>();

const emit = defineEmits<{ clear: [] }>();

const { t } = useI18n();

const open = ref(summary !== null);
const bodyId = useId();

watch(
    () => summary,
    (next, previous) => {
        if (next !== null && previous === null) open.value = true;
    },
);
</script>

<template>
    <section
        class="filter-card"
        :class="{ 'filter-card--active': summary !== null }">
        <h3 class="filter-card__heading">
            <button
                type="button"
                class="filter-card__toggle"
                :aria-expanded="open"
                :aria-controls="bodyId"
                :disabled="!available"
                @click="open = !open">
                <AppIcon
                    class="filter-card__chevron"
                    :name="open ? 'chevron-down' : 'chevron-right'"
                    :size="14" />
                <span class="filter-card__label">{{ label }}</span>
                <span
                    v-if="summary !== null"
                    class="filter-card__summary"
                    >{{ summary }}</span
                >
                <span
                    v-else-if="!available"
                    class="filter-card__summary"
                    >{{ t('screener.noData') }}</span
                >
            </button>
        </h3>

        <button
            v-if="summary !== null"
            type="button"
            class="filter-card__clear"
            :aria-label="t('screener.clearFilter', { name: label })"
            :disabled="busy"
            @click="emit('clear')">
            &times;
        </button>

        <div
            v-show="open"
            :id="bodyId"
            class="filter-card__body">
            <p
                v-if="tip !== null"
                class="filter-card__tip"
                >{{ tip }}</p
            >
            <slot />
        </div>
    </section>
</template>

<style lang="scss" scoped>
.filter-card {
    display: grid;
    grid-template-columns: 1fr auto;
    padding: $space-1 $space-2;
    border-bottom: $border-width solid $color-elevated;
}

.filter-card--active {
    border-left: 2px solid $color-accent-1;
}

.filter-card__heading {
    margin: 0;
    font-size: $font-size-base;
    font-weight: $font-weight-regular;
}

.filter-card__toggle {
    display: flex;
    gap: $space-2;
    align-items: baseline;
    width: 100%;
    padding: $space-2 0;
    border: none;
    background: none;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-base;
    text-align: left;
    cursor: pointer;

    &:disabled {
        color: $color-text-muted;
        cursor: default;
    }
}

.filter-card__chevron {
    color: $color-text-muted;
}

.filter-card__label {
    flex: 1;
}

.filter-card__summary {
    color: $color-text-muted;
    font-size: $font-size-xs;
    font-variant-numeric: tabular-nums;
}

.filter-card__clear {
    align-self: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-md;
    line-height: 1;
    cursor: pointer;

    &:hover:not(:disabled) {
        background: $color-elevated;
        color: $color-text;
    }
}

.filter-card__body {
    grid-column: 1 / -1;
    padding: 0 0 $space-3;
}

.filter-card__tip {
    margin: 0 0 $space-2;
    color: $color-text-muted;
    font-size: $font-size-xs;
    line-height: $line-height-body;
}
</style>
