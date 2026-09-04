<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatCompact, formatDate, formatNumber } from '@/utils/formatters';
import { growth, numeric } from '@/utils/numbers';

type Quarter = {
    date: string;
    value: number | null;
    quarterOverQuarter: number | null;
    yearOverYear: number | null;
};

const { rows, metric } = defineProps<{
    rows: readonly Record<string, unknown>[];
    metric: 'eps' | 'earnings' | 'sales';
}>();

const QUARTERS_IN_YEAR = 4;

const FIELDS = {
    eps: 'reportedEPS',
    earnings: 'netIncome',
    sales: 'totalRevenue',
} as const;

const EMPTY_KEYS = { eps: 'noEpsData', earnings: 'noEarningsData', sales: 'noSalesData' } as const;

const { t } = useI18n();

const quarters = computed<Quarter[]>(() => {
    const field = FIELDS[metric];
    const values = rows.map((row) => numeric(row[field]));

    return rows.flatMap((row, index) => {
        const date = row.fiscalDateEnding;
        if (typeof date !== 'string') return [];

        return [
            {
                date,
                value: values[index] ?? null,
                quarterOverQuarter: growth(values[index] ?? null, values[index + 1] ?? null),
                yearOverYear: growth(values[index] ?? null, values[index + QUARTERS_IN_YEAR] ?? null),
            },
        ];
    });
});

const columnLabel = computed(() => t(`sidebar.${metric}Column`));

/** EPS is a per-share figure with cents; revenue and net income are large. */
const formatValue = (value: number | null): string =>
    value === null ? '—' : metric === 'eps' ? formatNumber(value, 2) : formatCompact(value);

const formatGrowth = (value: number | null): string => (value === null ? '—' : `${formatNumber(value, 1)}%`);

const tone = (value: number | null): string =>
    value === null ? '' : value > 0 ? 'financials__cell--up' : 'financials__cell--down';
</script>

<template>
    <table v-if="quarters.length > 0" class="financials">
        <thead>
            <tr>
                <th scope="col">{{ t(`sidebar.${metric}Reported`) }}</th>
                <th scope="col" class="financials__numeric">{{ columnLabel }}</th>
                <th scope="col" class="financials__numeric">{{ t(`sidebar.${metric}QoQ`) }}</th>
                <th scope="col" class="financials__numeric">{{ t(`sidebar.${metric}YoY`) }}</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="quarter in quarters" :key="quarter.date">
                <th scope="row">{{ formatDate(quarter.date) }}</th>
                <td class="financials__numeric">{{ formatValue(quarter.value) }}</td>
                <td class="financials__numeric" :class="tone(quarter.quarterOverQuarter)">
                    {{ formatGrowth(quarter.quarterOverQuarter) }}
                </td>
                <td class="financials__numeric" :class="tone(quarter.yearOverYear)">
                    {{ formatGrowth(quarter.yearOverYear) }}
                </td>
            </tr>
        </tbody>
    </table>

    <p v-else class="financials__empty">{{ t(`sidebar.${EMPTY_KEYS[metric]}`) }}</p>
</template>

<style lang="scss" scoped>
.financials {
    width: 100%;
    border-collapse: collapse;
    font-size: $font-size-xs;

    th,
    td {
        padding: $space-1 $space-2;
        font-weight: $font-weight-regular;
        text-align: start;
    }

    thead th {
        color: $color-text-muted;
        font-weight: $font-weight-medium;
    }

    tbody th {
        color: $color-text-muted;
        white-space: nowrap;
    }

    tbody td {
        color: $color-text;
    }

    tbody tr + tr {
        border-top: $border-width solid $color-elevated;
    }
}

.financials__numeric {
    font-variant-numeric: tabular-nums;
    text-align: end;
}

.financials__cell--up {
    color: $color-positive;
}

.financials__cell--down {
    color: $color-negative;
}

.financials__empty {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
}
</style>
