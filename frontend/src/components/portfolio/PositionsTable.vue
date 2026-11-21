<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import type { ValuedPosition } from '@ereuna/shared';

import { direction, formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';

const { positions, cash } = defineProps<{
    positions: readonly ValuedPosition[];
    cash: number;
}>();

const emit = defineEmits<{ close: [position: ValuedPosition] }>();

const { t } = useI18n();
</script>

<template>
    <div class="positions-table">
        <table class="positions-table__table">
            <thead>
                <tr>
                    <th scope="col">{{ t('portfolio.symbol') }}</th>
                    <th scope="col">{{ t('portfolio.type') }}</th>
                    <th
                        scope="col"
                        class="positions-table__num"
                        >{{ t('portfolio.shares') }}</th
                    >
                    <th
                        scope="col"
                        class="positions-table__num"
                        >{{ t('portfolio.avgPrice') }}</th
                    >
                    <th
                        scope="col"
                        class="positions-table__num"
                        >{{ t('portfolio.currentPrice') }}</th
                    >
                    <th
                        scope="col"
                        class="positions-table__num"
                        >{{ t('portfolio.marketValue') }}</th
                    >
                    <th
                        scope="col"
                        class="positions-table__num"
                        >{{ t('portfolio.pnlDollar') }}</th
                    >
                    <th
                        scope="col"
                        class="positions-table__num"
                        >{{ t('portfolio.pnlPercent') }}</th
                    >
                    <th
                        scope="col"
                        class="positions-table__num"
                        >{{ t('portfolio.percPortfolio') }}</th
                    >
                    <th scope="col"
                        ><span class="positions-table__sr">{{ t('portfolio.rowActions') }}</span></th
                    >
                </tr>
            </thead>

            <tbody>
                <tr
                    v-for="row in positions"
                    :key="row.symbol">
                    <th
                        scope="row"
                        class="positions-table__symbol"
                        >{{ row.symbol }}</th
                    >
                    <td>
                        <span
                            class="positions-table__side"
                            :class="`positions-table__side--${row.side}`">
                            {{ row.side === 'long' ? t('portfolio.long') : t('portfolio.short') }}
                        </span>
                    </td>
                    <td class="positions-table__num">{{ formatNumber(row.shares, 0) }}</td>
                    <td class="positions-table__num">{{ formatCurrency(row.avgPrice) }}</td>
                    <td class="positions-table__num">
                        <span :class="{ 'positions-table__live': row.live }">
                            {{ row.price === null ? '—' : formatCurrency(row.price) }}
                        </span>
                    </td>
                    <td class="positions-table__num">
                        {{ row.marketValue === null ? '—' : formatCurrency(row.marketValue) }}
                    </td>
                    <td
                        class="positions-table__num"
                        :class="`positions-table__num--${direction(row.unrealizedPL)}`">
                        {{ row.unrealizedPL === null ? '—' : formatCurrency(row.unrealizedPL) }}
                    </td>
                    <td
                        class="positions-table__num"
                        :class="`positions-table__num--${direction(row.unrealizedPLPercent)}`">
                        {{ row.unrealizedPLPercent === null ? '—' : formatPercent(row.unrealizedPLPercent) }}
                    </td>
                    <td class="positions-table__num">
                        {{ row.weight === null ? '—' : `${formatNumber(row.weight, 1)}%` }}
                    </td>
                    <td>
                        <button
                            type="button"
                            class="btn btn--small"
                            @click="emit('close', row)">
                            {{ t('portfolio.close') }}
                        </button>
                    </td>
                </tr>

                <tr v-if="positions.length === 0">
                    <td
                        class="positions-table__empty"
                        colspan="10"
                        >{{ t('portfolio.noActivePositions') }}</td
                    >
                </tr>
            </tbody>

            <tfoot>
                <tr>
                    <th
                        scope="row"
                        colspan="5"
                        >{{ t('portfolio.cash') }}</th
                    >
                    <td
                        class="positions-table__num"
                        :class="{ 'positions-table__num--down': cash < 0 }">
                        {{ formatCurrency(cash) }}
                    </td>
                    <td colspan="4"></td>
                </tr>
            </tfoot>
        </table>
    </div>
</template>

<style lang="scss" scoped>
.positions-table {
    overflow-x: auto;

    th,
    td {
        padding: 0.5em 0.75em;
        border-bottom: $border-width solid $color-elevated;
        text-align: left;
    }

    thead th {
        font-size: $font-size-xs;
        font-weight: $font-weight-regular;
        color: $color-text-muted;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    tfoot th,
    tfoot td {
        border-bottom: 0;
        font-weight: $font-weight-medium;
    }

    // A price arriving from the live feed is marked, so a stale close and a
    // moving quote are not read as the same number.
}

.positions-table__table {
    width: 100%;
    border-collapse: collapse;
    font-size: $font-size-sm;
    white-space: nowrap;
}

.positions-table__symbol {
    font-weight: $font-weight-medium;
    color: $color-text;
}

.positions-table__num {
    font-family: $font-mono;
    text-align: right;

    &--up {
        color: $color-positive;
    }

    &--down {
        color: $color-negative;
    }
}

.positions-table__side {
    padding: 0.1em 0.5em;
    border-radius: $radius-pill;
    font-size: $font-size-xs;

    &--long {
        background: color-mix(in srgb, $color-positive 15%, transparent);
        color: $color-positive;
    }

    &--short {
        background: color-mix(in srgb, $color-negative 15%, transparent);
        color: $color-negative;
    }
}

.positions-table__live {
    color: $color-accent-1;
}

.positions-table__empty {
    padding: 2em;
    color: $color-text-muted;
    text-align: center;
}

.positions-table__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}
</style>
