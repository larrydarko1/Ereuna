<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CorporateAction } from '@ereuna/shared';
import { useRowLimit } from '@/composables/ui/useRowLimit';
import { formatDate, formatNumber } from '@/utils/formatters';

type Row = { key: string; date: string; value: string };

const { actions, kind } = defineProps<{
    actions: readonly CorporateAction[];
    kind: 'dividends' | 'splits';
}>();

/** How many rows are shown before the panel is expanded. */
const DEFAULT_ROWS = 4;

const { t } = useI18n();

const all = computed<Row[]>(() =>
    actions.map((action, index) => {
        const amount = kind === 'dividends' ? action.amount : action.ratio;
        return {
            key: `${action.date}-${index}`,
            date: formatDate(action.date),
            value: typeof amount === 'number' ? formatNumber(amount, kind === 'dividends' ? 4 : 2) : '—',
        };
    }),
);

const { rows, expanded, toggleable, hidden, toggle } = useRowLimit(() => all.value, DEFAULT_ROWS);
</script>

<template>
    <table
        v-if="rows.length > 0"
        class="actions">
        <thead>
            <tr>
                <th scope="col">{{ t(`sidebar.${kind}Reported`) }}</th>
                <th
                    scope="col"
                    class="actions__numeric"
                    >{{ t(`sidebar.${kind}Column`) }}</th
                >
            </tr>
        </thead>
        <tbody>
            <tr
                v-for="row in rows"
                :key="row.key">
                <th scope="row">{{ row.date }}</th>
                <td class="actions__numeric">{{ row.value }}</td>
            </tr>
        </tbody>
    </table>

    <p
        v-else
        class="actions__empty">
        {{ kind === 'dividends' ? t('sidebar.noDividendData') : t('sidebar.noSplitsData') }}
    </p>

    <button
        v-if="toggleable"
        type="button"
        class="btn btn--link actions__more"
        :aria-expanded="expanded"
        @click="toggle">
        {{ expanded ? t('sidebar.showLess') : t('sidebar.showAll', { count: hidden }) }}
    </button>
</template>

<style lang="scss" scoped>
/* –––––– Table –––––– */

.actions {
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

.actions__numeric {
    font-variant-numeric: tabular-nums;
    text-align: end;
}

/* –––––– Empty and expand –––––– */

.actions__empty {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
}

.actions__more {
    margin-top: $space-2;
}
</style>
