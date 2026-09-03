<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CorporateAction } from '@ereuna/shared';
import { formatDate, formatNumber } from '@/utils/formatters';

const { actions, kind, expandable = false } = defineProps<{
    actions: readonly CorporateAction[];
    kind: 'dividends' | 'splits';
    expandable?: boolean; // Whether a "show all" control is offered — false once everything is loaded
}>();

const emit = defineEmits<{ expand: [] }>();

const { t } = useI18n();

type Row = { key: string; date: string; value: string };

const rows = computed<Row[]>(() =>
    actions.flatMap((action, index) => {
        const amount = kind === 'dividends' ? action.amount : action.ratio;
        return [
            {
                key: `${action.date}-${index}`,
                date: formatDate(action.date),
                value: typeof amount === 'number' ? formatNumber(amount, kind === 'dividends' ? 4 : 2) : '—',
            },
        ];
    }),
);
</script>

<template>
    <table v-if="rows.length > 0" class="actions">
        <thead>
            <tr>
                <th scope="col">{{ t(`sidebar.${kind}Reported`) }}</th>
                <th scope="col" class="actions__numeric">{{ t(`sidebar.${kind}Column`) }}</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="row in rows" :key="row.key">
                <th scope="row">{{ row.date }}</th>
                <td class="actions__numeric">{{ row.value }}</td>
            </tr>
        </tbody>
    </table>

    <p v-else class="actions__empty">
        {{ kind === 'dividends' ? t('sidebar.noDividendData') : t('sidebar.noSplitsData') }}
    </p>

    <button v-if="expandable && rows.length > 0" type="button" class="actions__more" @click="emit('expand')">
        {{ t('sidebar.showAll') }}
    </button>
</template>

<style lang="scss" scoped>
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

.actions__empty {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
}

.actions__more {
    margin-top: $space-2;
    padding: 0;
    border: none;
    background: none;
    color: $color-accent-1;
    font-size: $font-size-xs;
    cursor: pointer;
}
</style>
