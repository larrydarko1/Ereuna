<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ScreenerResult } from '@/api/screener';
import { findColumn, readColumn, type ColumnFormat } from '@/constants/screener';
import { formatCompact, formatNumber } from '@/utils/formatters';

const {
    items,
    columns,
    selected = '',
    hiddenSymbols = [],
    pending = false,
} = defineProps<{
    items: ScreenerResult[];
    columns: readonly string[];
    selected?: string;
    hiddenSymbols?: readonly string[];
    pending?: boolean;
}>();

const emit = defineEmits<{
    select: [symbol: string];
    toggleHidden: [symbol: string];
}>();

const PLACEHOLDER = '—';

const { t } = useI18n();

/** Only columns the catalogue knows how to label and format are rendered. */
const resolved = computed(() => columns.map((path) => findColumn(path)).filter((column) => column !== null));

function header(filterKey: string): string {
    return t(`screener.fields.${filterKey}`);
}

function cell(row: ScreenerResult, path: string, format: ColumnFormat): string {
    const value = readColumn(row, path);
    if (value === null || value === '') return PLACEHOLDER;

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return PLACEHOLDER;
        switch (format) {
            case 'compact':
                return formatCompact(value);
            case 'percent':
                return `${formatNumber(value, 2)}%`;
            case 'date':
                return PLACEHOLDER;
            default:
                return formatNumber(value, 2);
        }
    }

    return typeof value === 'string' ? value : PLACEHOLDER;
}

function isNegative(row: ScreenerResult, path: string, format: ColumnFormat): boolean {
    if (format !== 'percent') return false;
    const value = readColumn(row, path);
    return typeof value === 'number' && value < 0;
}

function isPositive(row: ScreenerResult, path: string, format: ColumnFormat): boolean {
    if (format !== 'percent') return false;
    const value = readColumn(row, path);
    return typeof value === 'number' && value > 0;
}

/**
 * Up and down move the selection, which is what drives the chart beside the
 * table. Keeping it on the tbody rather than on the document means the arrow
 * keys still scroll the page when the table does not have focus.
 */
function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    const index = items.findIndex((row) => row.symbol === selected);
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
    const target = items[next];
    if (target === undefined) return;

    event.preventDefault();
    emit('select', target.symbol);
}
</script>

<template>
    <div
        class="results-table"
        :class="{ 'results-table--pending': pending }">
        <table class="results-table__table">
            <thead>
                <tr>
                    <th
                        scope="col"
                        class="results-table__th results-table__th--symbol"
                        >{{ t('screener.symbol') }}</th
                    >
                    <th
                        scope="col"
                        class="results-table__th results-table__th--name"
                        >{{ t('screener.name') }}</th
                    >
                    <th
                        v-for="column in resolved"
                        :key="column.path"
                        scope="col"
                        class="results-table__th results-table__th--figure">
                        {{ header(column.filterKey) }}
                    </th>
                    <th
                        scope="col"
                        class="results-table__th results-table__th--actions">
                        <span class="results-table__sr">{{ t('common.settings') }}</span>
                    </th>
                </tr>
            </thead>

            <tbody>
                <tr
                    v-for="row in items"
                    :key="row.symbol"
                    class="results-table__row"
                    :class="{ 'results-table__row--selected': row.symbol === selected }"
                    :aria-selected="row.symbol === selected"
                    tabindex="0"
                    @click="emit('select', row.symbol)"
                    @keydown="onKeydown"
                    @keydown.enter="emit('select', row.symbol)">
                    <td class="results-table__td results-table__td--symbol">{{ row.symbol }}</td>
                    <td class="results-table__td results-table__td--name">{{ row.name ?? PLACEHOLDER }}</td>
                    <td
                        v-for="column in resolved"
                        :key="column.path"
                        class="results-table__td results-table__td--figure"
                        :class="{
                            'results-table__td--up': isPositive(row, column.path, column.format),
                            'results-table__td--down': isNegative(row, column.path, column.format),
                        }">
                        {{ cell(row, column.path, column.format) }}
                    </td>
                    <td class="results-table__td results-table__td--actions">
                        <button
                            type="button"
                            class="results-table__action"
                            :aria-label="
                                hiddenSymbols.includes(row.symbol)
                                    ? t('screener.unhide', { symbol: row.symbol })
                                    : t('screener.hide', { symbol: row.symbol })
                            "
                            @click.stop="emit('toggleHidden', row.symbol)">
                            {{ hiddenSymbols.includes(row.symbol) ? '👁' : '⊘' }}
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<style lang="scss" scoped>
.results-table {
    overflow-x: auto;
}

.results-table--pending {
    opacity: 0.5;
}

.results-table__table {
    width: 100%;
    border-collapse: collapse;
    font-size: $font-size-xs;
}

.results-table__th {
    position: sticky;
    top: 0;
    z-index: $z-sticky;
    padding: $space-2;
    border-bottom: $border-width solid $color-elevated;
    background: $color-surface;
    color: $color-text-muted;
    font-weight: $font-weight-medium;
    text-align: right;
    white-space: nowrap;
}

.results-table__th--symbol,
.results-table__th--name {
    text-align: left;
}

.results-table__th--actions {
    width: 32px;
}

.results-table__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
}

.results-table__row {
    cursor: pointer;

    &:hover {
        background: $color-elevated;
    }

    &:focus-visible {
        outline: 2px solid $color-accent-1;
        outline-offset: -2px;
    }
}

.results-table__row--selected {
    background: $color-elevated;
}

.results-table__td {
    padding: $space-1 $space-2;
    border-bottom: $border-width solid $color-sunken;
    color: $color-text;
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.results-table__td--symbol {
    font-weight: $font-weight-bold;
    text-align: left;
}

.results-table__td--name {
    max-width: 220px;
    overflow: hidden;
    color: $color-text-muted;
    text-align: left;
    text-overflow: ellipsis;
}

.results-table__td--up {
    color: $color-positive;
}

.results-table__td--down {
    color: $color-negative;
}

.results-table__action {
    border: none;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-sm;
    line-height: 1;
    cursor: pointer;

    &:hover {
        color: $color-text;
    }
}
</style>
