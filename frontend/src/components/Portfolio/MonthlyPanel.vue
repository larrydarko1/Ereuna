<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PortfolioValuePoint } from '@ereuna/shared';
import type { TradeInput } from '@/api/trades';
import BarChart, { type Bar } from '@/components/viz/BarChart.vue';
import { direction, formatCurrency, formatPercent } from '@/utils/formatters';
import { i18n } from '@/i18n';

type Month = {
    key: string;
    label: string;
    start: number;
    end: number;
    cashFlow: number;
    profit: number;
    returnPercent: number | null;
    trades: number;
};

const { valueHistory, trades } = defineProps<{
    valueHistory: readonly PortfolioValuePoint[];
    /** The whole log, not a page of it: a month's cash flow is wrong if any
     *  deposit inside it is missing. */
    trades: readonly TradeInput[];
}>();

const { t } = useI18n();

const months = computed<Month[]>(() => {
    if (valueHistory.length === 0) return [];

    // Closing value per month, and the order the months occurred in.
    const closes = new Map<string, number>();
    const order: string[] = [];
    for (const point of valueHistory) {
        const key = monthKey(point.date);
        if (!closes.has(key)) order.push(key);
        // Value history is ascending, so the last write for a month is its close.
        closes.set(key, point.value);
    }

    const flows = new Map<string, number>();
    const counts = new Map<string, number>();
    for (const trade of trades) {
        const key = monthKey(trade.tradeDate);
        if (trade.action === 'deposit' || trade.action === 'withdrawal') {
            const signed = trade.action === 'deposit' ? trade.total : -trade.total;
            flows.set(key, (flows.get(key) ?? 0) + signed);
        } else {
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
    }

    const rows: Month[] = [];
    let previousClose: number | null = null;

    for (const key of order) {
        const end = closes.get(key) ?? 0;
        // The first month has nothing before it, so it opens at its own close
        // less what happened during it — which for a new portfolio is zero.
        const cashFlow = flows.get(key) ?? 0;
        const start = previousClose ?? Math.max(end - cashFlow, 0);
        const profit = end - start - cashFlow;

        rows.push({
            key,
            label: monthLabel(key),
            start,
            end,
            cashFlow,
            profit,
            // A month that opened at nothing has no denominator. Reporting an
            // infinite return on the first deposit is worse than reporting none.
            returnPercent: start === 0 ? null : (profit / start) * 100,
            trades: counts.get(key) ?? 0,
        });

        previousClose = end;
    }

    return rows.reverse();
});

const winning = computed(() => months.value.filter((month) => month.profit > 0).length);
const losing = computed(() => months.value.filter((month) => month.profit < 0).length);

const returnBars = computed<Bar[]>(() =>
    // Oldest first: a chart reads left to right through time, while the table
    // above reads newest first because that is the row people want.
    [...months.value].reverse().map((month) => ({ label: month.label, value: month.returnPercent ?? 0 })),
);

/** `2026-09-02` → `2026-09`, taken off the string rather than through a Date:
 *  the API's dates are already UTC calendar days, and parsing them into a local
 *  Date moves the early hours of a month into the one before. */
function monthKey(iso: string): string {
    return iso.slice(0, 7);
}

function monthLabel(key: string): string {
    const [year, month] = key.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString(i18n.global.locale.value, { year: 'numeric', month: 'short' });
}
</script>

<template>
    <section class="monthly-panel">
        <header class="monthly-panel__header">
            <h2 class="monthly-panel__title">{{ t('portfolio.monthlyPerformanceAnalysis') }}</h2>
            <div
                v-if="months.length > 0"
                class="monthly-panel__tally">
                <span class="monthly-panel__tally-item monthly-panel__tally-item--up">
                    {{ t('portfolio.winning') }} {{ winning }}
                </span>
                <span class="monthly-panel__tally-item monthly-panel__tally-item--down">
                    {{ t('portfolio.losing') }} {{ losing }}
                </span>
            </div>
        </header>

        <template v-if="months.length > 0">
            <BarChart
                :bars="returnBars"
                :label="t('portfolio.monthlyReturns')"
                :format="(value) => formatPercent(value)" />

            <div class="monthly-panel__scroll">
                <table class="monthly-panel__table">
                    <thead>
                        <tr>
                            <th scope="col">{{ t('portfolio.date') }}</th>
                            <th
                                scope="col"
                                class="monthly-panel__num"
                                >{{ t('portfolio.startingValue') }}</th
                            >
                            <th
                                scope="col"
                                class="monthly-panel__num"
                                >{{ t('portfolio.endingValue') }}</th
                            >
                            <th
                                scope="col"
                                class="monthly-panel__num"
                                >{{ t('portfolio.cashFlow') }}</th
                            >
                            <th
                                scope="col"
                                class="monthly-panel__num"
                                >{{ t('portfolio.pl') }}</th
                            >
                            <th
                                scope="col"
                                class="monthly-panel__num"
                                >{{ t('portfolio.return') }}</th
                            >
                            <th
                                scope="col"
                                class="monthly-panel__num"
                                >{{ t('portfolio.trades') }}</th
                            >
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="month in months"
                            :key="month.key">
                            <th scope="row">{{ month.label }}</th>
                            <td class="monthly-panel__num">{{ formatCurrency(month.start) }}</td>
                            <td class="monthly-panel__num">{{ formatCurrency(month.end) }}</td>
                            <td class="monthly-panel__num">
                                {{ month.cashFlow === 0 ? '—' : formatCurrency(month.cashFlow) }}
                            </td>
                            <td
                                class="monthly-panel__num"
                                :class="`monthly-panel__num--${direction(month.profit)}`">
                                {{ formatCurrency(month.profit) }}
                            </td>
                            <td
                                class="monthly-panel__num"
                                :class="`monthly-panel__num--${direction(month.returnPercent)}`">
                                {{ month.returnPercent === null ? '—' : formatPercent(month.returnPercent) }}
                            </td>
                            <td class="monthly-panel__num">{{ month.trades }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>

        <p
            v-else
            class="form-hint"
            >{{ t('portfolio.noActivity') }}</p
        >
    </section>
</template>

<style lang="scss" scoped>
.monthly-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75em;

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

.monthly-panel__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5em;
}

.monthly-panel__title {
    margin: 0;
    font-size: $font-size-md;
    color: $color-text;
}

.monthly-panel__tally {
    display: flex;
    gap: 0.75em;
    font-size: $font-size-xs;
}

.monthly-panel__tally-item {
    &--up {
        color: $color-positive;
    }

    &--down {
        color: $color-negative;
    }
}

.monthly-panel__scroll {
    overflow-x: auto;
}

.monthly-panel__table {
    width: 100%;
    border-collapse: collapse;
    font-size: $font-size-sm;
    white-space: nowrap;
}

.monthly-panel__num {
    font-family: $font-mono;
    text-align: right;

    &--up {
        color: $color-positive;
    }

    &--down {
        color: $color-negative;
    }
}
</style>
