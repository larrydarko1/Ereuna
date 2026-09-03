<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { TradeRow } from '@/api/trades';
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters';

defineProps<{
    trades: readonly TradeRow[];
    total: number;
    page: number;
    pageCount: number;
}>();

const emit = defineEmits<{
    edit: [trade: TradeRow];
    delete: [trade: TradeRow];
    page: [page: number];
}>();

const { t } = useI18n();
</script>

<template>
    <section class="trade-history">
        <header class="trade-history__header">
            <h2 class="trade-history__title">
                {{ t('portfolio.transactionHistory') }}
                <span class="trade-history__count">{{ total }}</span>
            </h2>
        </header>

        <div class="trade-history__scroll">
            <table class="trade-history__table">
                <thead>
                    <tr>
                        <th scope="col">{{ t('portfolio.date') }}</th>
                        <th scope="col">{{ t('portfolio.action') }}</th>
                        <th scope="col">{{ t('portfolio.symbol') }}</th>
                        <th scope="col" class="trade-history__num">{{ t('portfolio.shares') }}</th>
                        <th scope="col" class="trade-history__num">{{ t('portfolio.price') }}</th>
                        <th scope="col" class="trade-history__num">{{ t('portfolio.fees') }}</th>
                        <th scope="col" class="trade-history__num">{{ t('portfolio.total') }}</th>
                        <th scope="col"><span class="trade-history__sr">{{ t('portfolio.rowActions') }}</span></th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-for="trade in trades" :key="trade.id">
                        <td>{{ formatDate(trade.tradeDate) }}</td>
                        <td>
                            <span class="trade-history__action" :class="`trade-history__action--${trade.action}`">
                                {{ t(`portfolio.actions.${trade.action}`) }}
                            </span>
                        </td>
                        <td class="trade-history__symbol">{{ trade.symbol ?? '—' }}</td>
                        <td class="trade-history__num">
                            {{ trade.shares === 0 ? '—' : formatNumber(trade.shares, 0) }}
                        </td>
                        <td class="trade-history__num">
                            {{ trade.price === 0 ? '—' : formatCurrency(trade.price) }}
                        </td>
                        <td class="trade-history__num">{{ formatCurrency(trade.commission) }}</td>
                        <td class="trade-history__num">{{ formatCurrency(trade.total) }}</td>
                        <td class="trade-history__row-actions">
                            <button type="button" class="btn btn--small" @click="emit('edit', trade)">
                                {{ t('common.edit') }}
                            </button>
                            <button type="button" class="btn btn--small btn--danger" @click="emit('delete', trade)">
                                {{ t('common.delete') }}
                            </button>
                        </td>
                    </tr>

                    <tr v-if="trades.length === 0">
                        <td class="trade-history__empty" colspan="8">{{ t('portfolio.noTransactionHistory') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <nav v-if="pageCount > 1" class="trade-history__pager" :aria-label="t('portfolio.transactionHistory')">
            <button type="button" class="btn btn--small" :disabled="page <= 1" @click="emit('page', page - 1)">
                {{ t('common.previous') }}
            </button>
            <span class="trade-history__page">{{ t('common.pageOf', { page, pages: pageCount }) }}</span>
            <button
                type="button"
                class="btn btn--small"
                :disabled="page >= pageCount"
                @click="emit('page', page + 1)"
            >
                {{ t('common.next') }}
            </button>
        </nav>
    </section>
</template>

<style lang="scss" scoped>
.trade-history {
    display: flex;
    flex-direction: column;
    gap: 0.5em;

    th,
    td {
        padding: 0.45em 0.75em;
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
}

.trade-history__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.trade-history__title {
    display: flex;
    align-items: center;
    gap: 0.5em;
    margin: 0;
    font-size: $font-size-md;
    color: $color-text;
}

.trade-history__count {
    padding: 0.1em 0.5em;
    border-radius: $radius-pill;
    background: $color-sunken;
    font-family: $font-mono;
    font-size: $font-size-xs;
    color: $color-text-muted;
}

.trade-history__scroll {
    overflow-x: auto;
}

.trade-history__table {
    width: 100%;
    border-collapse: collapse;
    font-size: $font-size-sm;
    white-space: nowrap;
}

.trade-history__symbol {
    font-weight: $font-weight-medium;
}

.trade-history__num {
    font-family: $font-mono;
    text-align: right;
}

.trade-history__action {
    padding: 0.1em 0.5em;
    border-radius: $radius-pill;
    font-size: $font-size-xs;

    // Colour says what the action did to the book, not whether it made
    // money — an exit is neither good nor bad until the log is replayed.
    &--buy,
    &--cover,
    &--deposit {
        background: color-mix(in srgb, $color-positive 15%, transparent);
        color: $color-positive;
    }

    &--sell,
    &--short,
    &--withdrawal {
        background: color-mix(in srgb, $color-negative 15%, transparent);
        color: $color-negative;
    }
}

.trade-history__row-actions {
    display: flex;
    gap: 0.35em;
}

.trade-history__empty {
    padding: 2em;
    color: $color-text-muted;
    text-align: center;
}

.trade-history__pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75em;
}

.trade-history__page {
    font-size: $font-size-xs;
    color: $color-text-muted;
}

.trade-history__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}
</style>
