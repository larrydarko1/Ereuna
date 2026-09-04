<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Financials } from '@/api/market';
import AppDialog from '@/components/ui/AppDialog.vue';
import { formatCompact, formatNumber } from '@/utils/formatters';
import { growth, numeric } from '@/utils/numbers';

type Column = { key: string; label: string };

const { symbol, statements = null, pending = false } = defineProps<{
    symbol: string;
    statements?: Financials | null;
    pending?: boolean;
}>();

const emit = defineEmits<{ close: [] }>();

/** Above this, a figure reads better abbreviated than written out in full. */
const COMPACT_THRESHOLD = 100_000;

const { t, te } = useI18n();

const period = ref<'annual' | 'quarterly'>('annual');
const showDescriptions = ref(false);

const periods = computed<readonly Record<string, unknown>[]>(() => {
    if (statements === null) return [];
    return period.value === 'annual' ? statements.annual : statements.quarterly;
});

const columns = computed<Column[]>(() =>
    periods.value.flatMap((row) => {
        const date = row.fiscalDateEnding;
        return typeof date === 'string' ? [{ key: date, label: periodLabel(date) }] : [];
    }),
);

/**
 * Every line any period reports, in the order they are first seen.
 * Taking the keys of the newest period alone — which is what the old popup did
 * — hides any line a company reported for years and then stopped.
 */
const attributes = computed<string[]>(() => {
    const seen = new Set<string>();
    for (const row of periods.value) {
        for (const key of Object.keys(row)) {
            if (key !== 'fiscalDateEnding') seen.add(key);
        }
    }
    return [...seen];
});

/** One row of the table: a label, its cells, and the change into each cell. */
const rows = computed(() =>
    attributes.value.map((attribute) => {
        const values = periods.value.map((row) => numeric(row[attribute]));
        return {
            attribute,
            label: translate(`financials.attributes.${attribute}`) ?? attribute,
            description: translate(`financials.tooltips.${attribute}`) ?? '',
            cells: values.map((value, index) => ({
                key: columns.value[index]?.key ?? String(index),
                value: format(value),
                // Periods arrive newest first, so the one to compare against is
                // the next entry along, not the previous one.
                change: growth(value, values[index + 1] ?? null),
            })),
        };
    }),
);

/**
 * A translation if there is one, else null.
 * The statements carry whatever line items the filing had, and no locale file
 * is going to name all of them; asking for a key that does not exist would
 * print the key itself into the table.
 */
function translate(key: string): string | null {
    return te(key) ? t(key) : null;
}

function format(value: number | null): string {
    if (value === null) return '—';
    return Math.abs(value) >= COMPACT_THRESHOLD ? formatCompact(value) : formatNumber(value, 2);
}

/** "Q3 2024" for a quarter, "2024" for a year. */
function periodLabel(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const year = date.getUTCFullYear();
    return period.value === 'annual' ? String(year) : `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${year}`;
}

const formatChange = (value: number | null): string => (value === null ? '' : `${formatNumber(value, 1)}%`);
</script>

<template>
    <AppDialog :title="`${t('financials.title')} — ${symbol}`" size="lg" @close="emit('close')">
        <div class="financials-dialog__controls">
            <div class="financials-dialog__periods" role="group" :aria-label="t('financials.period')">
                <button
                    v-for="option in (['annual', 'quarterly'] as const)"
                    :key="option"
                    type="button"
                    class="financials-dialog__period"
                    :class="{ 'financials-dialog__period--active': period === option }"
                    :aria-pressed="period === option"
                    @click="period = option"
                >
                    {{ t(`financials.${option}`) }}
                </button>
            </div>

            <label class="financials-dialog__toggle">
                <input v-model="showDescriptions" type="checkbox" />
                {{ t('financials.showDescriptions') }}
            </label>
        </div>

        <p v-if="pending" class="financials-dialog__note">{{ t('sidebar.loading') }}</p>
        <p v-else-if="rows.length === 0" class="financials-dialog__note">{{ t('financials.noData') }}</p>

        <div v-else class="financials-dialog__scroll">
            <table class="financials-dialog__table">
                <thead>
                    <tr>
                        <th scope="col" class="financials-dialog__sticky">{{ t('financials.attribute') }}</th>
                        <th v-for="column in columns" :key="column.key" scope="col">{{ column.label }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in rows" :key="row.attribute">
                        <th scope="row" class="financials-dialog__sticky">
                            {{ row.label }}
                            <span
                                v-if="showDescriptions && row.description !== ''"
                                class="financials-dialog__description"
                            >
                                {{ row.description }}
                            </span>
                        </th>
                        <td v-for="cell in row.cells" :key="cell.key">
                            {{ cell.value }}
                            <span
                                v-if="cell.change !== null"
                                class="financials-dialog__change"
                                :class="
                                    cell.change > 0
                                        ? 'financials-dialog__change--up'
                                        : 'financials-dialog__change--down'
                                "
                            >
                                {{ formatChange(cell.change) }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </AppDialog>
</template>

<style lang="scss" scoped>
.financials-dialog__controls {
    display: flex;
    flex-wrap: wrap;
    gap: $space-3;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-3;
}

.financials-dialog__periods {
    display: flex;
    gap: $space-1;
}

.financials-dialog__period {
    padding: $space-1 $space-3;
    border: $border-width solid $color-elevated;
    border-radius: $radius-pill;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-xs;
    cursor: pointer;
}

.financials-dialog__period--active {
    border-color: $color-accent-1;
    color: $color-text;
}

.financials-dialog__toggle {
    display: flex;
    gap: $space-1;
    align-items: center;
    color: $color-text-muted;
    font-size: $font-size-xs;
}

// The table is wider than any dialog, so it scrolls inside its own box rather
// than pushing the page sideways.
.financials-dialog__scroll {
    overflow: auto;
    max-height: 60vh;
}

.financials-dialog__table {
    border-collapse: collapse;
    width: 100%;
    font-size: $font-size-xs;

    th,
    td {
        padding: $space-1 $space-2;
        text-align: end;
        white-space: nowrap;
    }

    thead th {
        position: sticky;
        top: 0;
        z-index: $z-base;
        background: $color-surface;
        color: $color-text-muted;
    }

    tbody tr + tr {
        border-top: $border-width solid $color-elevated;
    }

    tbody td {
        color: $color-text;
        font-variant-numeric: tabular-nums;
    }
}

.financials-dialog__sticky {
    position: sticky;
    left: 0;
    z-index: $z-base;
    background: $color-surface;
    color: $color-text-muted;
    font-weight: $font-weight-regular;
    text-align: start;
}

.financials-dialog__description {
    display: block;
    max-width: 352px;
    color: $color-text-muted;
    font-size: $font-size-xs;
    line-height: $line-height-body;
    white-space: normal;
}

.financials-dialog__change {
    display: block;
    font-size: $font-size-xs;
}

.financials-dialog__change--up {
    color: $color-positive;
}

.financials-dialog__change--down {
    color: $color-negative;
}
</style>
