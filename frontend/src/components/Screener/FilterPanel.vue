<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { FilterDescriptor, FilterValue } from '@/api/screener';
import DateFilter from '@/components/screener/DateFilter.vue';
import EnumFilter from '@/components/screener/EnumFilter.vue';
import FilterCard from '@/components/screener/FilterCard.vue';
import FlagFilter from '@/components/screener/FlagFilter.vue';
import MaFilter from '@/components/screener/MaFilter.vue';
import RangeFilter from '@/components/screener/RangeFilter.vue';
import type { FilterGrouping } from '@/composables/screener/useFilterRegistry';
import type { ActiveFilter, FilterKind } from '@/composables/screener/useScreenerFilters';
import { formatDate, formatNumber } from '@/utils/formatters';

const { groups, valueFor, saving = null, disabled = false } = defineProps<{
    groups: FilterGrouping[];
    valueFor: (key: string, kind: FilterKind) => ActiveFilter | null;
    saving?: string | null;
    disabled?: boolean; // No screener selected — there is nowhere to write a filter
}>();

const emit = defineEmits<{
    apply: [key: string, value: FilterValue];
    clear: [key: string];
}>();

const { t, te } = useI18n();

function label(key: string): string {
    return t(`screener.fields.${key}`);
}

/** Explanatory text, where one has been written for this filter. */
function tip(key: string): string | null {
    const path = `screener.tips.${key}`;
    return te(path) ? t(path) : null;
}

function summary(filter: FilterDescriptor): string | null {
    const value = valueFor(filter.key, filter.kind);
    if (value === null) return null;

    switch (value.kind) {
        case 'range':
            return `${formatNumber(value.min, 2)} – ${formatNumber(value.max, 2)}`;
        case 'date':
            return `${formatDate(value.from)} – ${formatDate(value.to)}`;
        case 'enum':
            return value.values.length <= 2
                ? value.values.join(', ')
                : t('screener.selectedCount', { count: value.values.length });
        case 'ma':
            return `${t(`screener.direction.${value.direction}`)} ${
                value.target === 'price' ? t('screener.maPrice') : t('screener.maDays', { days: value.target })
            }`;
        case 'flag':
            return t('common.yes');
    }
}

/** A control needs the stored value in its own shape; the union is narrowed once, here. */
function rangeValue(filter: FilterDescriptor): { min: number; max: number } | null {
    const value = valueFor(filter.key, filter.kind);
    return value?.kind === 'range' ? { min: value.min, max: value.max } : null;
}

function dateValue(filter: FilterDescriptor): { from: string; to: string } | null {
    const value = valueFor(filter.key, filter.kind);
    return value?.kind === 'date' ? { from: value.from, to: value.to } : null;
}

function enumValue(filter: FilterDescriptor): { values: string[] } | null {
    const value = valueFor(filter.key, filter.kind);
    return value?.kind === 'enum' ? { values: value.values } : null;
}

function maValue(filter: FilterDescriptor): { direction: string; target: string } | null {
    const value = valueFor(filter.key, filter.kind);
    return value?.kind === 'ma' ? { direction: value.direction, target: value.target } : null;
}

function flagValue(filter: FilterDescriptor): { enabled: boolean } | null {
    const value = valueFor(filter.key, filter.kind);
    return value?.kind === 'flag' ? { enabled: value.enabled } : null;
}

/**
 * Turning a flag off is a clear, not a write of `false` — the API stores flags
 * as presence, so `enabled: false` and "no filter" are the same state.
 */
function onFlag(key: string, value: { enabled: boolean }): void {
    if (value.enabled) emit('apply', key, value);
    else emit('clear', key);
}
</script>

<template>
    <div class="filter-panel">
        <p v-if="disabled" class="filter-panel__notice">{{ t('screener.selectScreener') }}</p>

        <section v-for="group in groups" :key="group.group" class="filter-panel__group">
            <h2 class="filter-panel__heading">{{ t(`screener.groups.${group.group}`) }}</h2>

            <FilterCard
                v-for="filter in group.filters"
                :key="filter.key"
                :label="label(filter.key)"
                :tip="tip(filter.key)"
                :summary="summary(filter)"
                :available="filter.available && !disabled"
                :busy="saving === filter.key"
                @clear="emit('clear', filter.key)"
            >
                <RangeFilter
                    v-if="filter.kind === 'range'"
                    :value="rangeValue(filter)"
                    :bounds="filter.bounds"
                    :busy="saving === filter.key"
                    @apply="emit('apply', filter.key, $event)"
                />
                <DateFilter
                    v-else-if="filter.kind === 'date'"
                    :value="dateValue(filter)"
                    :bounds="filter.bounds"
                    :busy="saving === filter.key"
                    @apply="emit('apply', filter.key, $event)"
                />
                <EnumFilter
                    v-else-if="filter.kind === 'enum'"
                    :options="filter.options"
                    :value="enumValue(filter)"
                    :busy="saving === filter.key"
                    @apply="emit('apply', filter.key, $event)"
                />
                <MaFilter
                    v-else-if="filter.kind === 'ma'"
                    :directions="filter.directions"
                    :targets="filter.targets"
                    :value="maValue(filter)"
                    :busy="saving === filter.key"
                    @apply="emit('apply', filter.key, $event)"
                />
                <FlagFilter
                    v-else
                    :value="flagValue(filter)"
                    :busy="saving === filter.key"
                    @apply="onFlag(filter.key, $event)"
                />
            </FilterCard>
        </section>
    </div>
</template>

<style lang="scss" scoped>
.filter-panel {
    display: flex;
    flex-direction: column;
    gap: $space-4;
}

.filter-panel__notice {
    margin: 0;
    padding: $space-3;
    border-radius: $radius-md;
    background: $color-sunken;
    color: $color-text-muted;
    font-size: $font-size-sm;
}

.filter-panel__heading {
    position: sticky;
    top: 0;
    z-index: $z-sticky;
    margin: 0;
    padding: $space-2;
    background: $color-surface;
    color: $color-text-muted;
    font-size: $font-size-xs;
    font-weight: $font-weight-bold;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}
</style>
