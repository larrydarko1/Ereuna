<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IndexPerformance } from '@ereuna/shared';
import { direction, formatCurrency, formatRatio } from '@/utils/formatters';

const { indexes } = defineProps<{ indexes: IndexPerformance[] }>();

/** The order they are shown in: broad market first, then size, then abroad. */
const ORDER = ['SPY', 'QQQ', 'DIA', 'IWM', 'EFA', 'EEM'];

const PERIODS = ['oneDay', 'oneMonth', 'fourMonth', 'oneYear', 'yearToDate'] as const;

const { t } = useI18n();

const rows = computed(() => [...indexes].sort((left, right) => rank(left.symbol) - rank(right.symbol)));

function rank(symbol: string): number {
    const index = ORDER.indexOf(symbol);
    // Anything the ingestor adds later sorts after the six we name, not before
    return index === -1 ? ORDER.length : index;
}
</script>

<template>
    <table class="index-table">
        <thead>
            <tr>
                <th scope="col">{{ t('dashboard.indexes.etf') }}</th>
                <th scope="col">{{ t('dashboard.indexes.price') }}</th>
                <th
                    v-for="period in PERIODS"
                    :key="period"
                    scope="col">
                    {{ t(`dashboard.indexes.${period}`) }}
                </th>
            </tr>
        </thead>
        <tbody>
            <tr
                v-for="row in rows"
                :key="row.symbol">
                <th
                    scope="row"
                    class="index-table__symbol"
                    >{{ row.symbol }}</th
                >
                <td class="index-table__figure">
                    {{ row.lastPrice === null ? '—' : formatCurrency(row.lastPrice) }}
                </td>
                <td
                    v-for="period in PERIODS"
                    :key="period"
                    class="index-table__figure"
                    :class="`index-table__figure--${direction(row[period])}`">
                    {{ row[period] === null ? '—' : formatRatio(row[period]) }}
                </td>
            </tr>
        </tbody>
    </table>
</template>

<style lang="scss" scoped>
.index-table {
    width: 100%;
    border-collapse: collapse;
    font-size: $font-size-sm;

    th,
    td {
        padding: 0.4em 0.6em;
        border-bottom: $border-width solid $color-elevated;
        text-align: right;
    }

    thead th {
        font-size: $font-size-xs;
        font-weight: $font-weight-regular;
        color: $color-text-muted;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    thead th:first-child,
    tbody th {
        text-align: left;
    }
}

.index-table__symbol {
    font-weight: $font-weight-medium;
    color: $color-text;
}

.index-table__figure {
    font-family: $font-mono;
    font-variant-numeric: tabular-nums;
    color: $color-text;
}

.index-table__figure--up {
    color: $color-positive;
}

.index-table__figure--down {
    color: $color-negative;
}

.index-table__figure--flat {
    color: $color-text-muted;
}
</style>
