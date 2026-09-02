<!--
  Portfolio — ten slots, one open at a time.

  A portfolio is event-sourced: the trade log is the only thing stored, and
  cash, positions, value history and every statistic are replayed from it on
  the server after each write. That single fact removes most of what the view
  this replaces was doing. It recomputed profit, total value, allocation and
  the monthly breakdown in the browser from a position list it had fetched
  separately, which is how it came to show a total value that disagreed with
  its own profit figure: the two were derived by different code from different
  snapshots. Here every number is read, not computed — the only exception is a
  live price arriving mid-session, which the holdings table folds in until the
  next read settles it.
-->
<template>
    <div class="portfolio">
        <PortfolioTabs
            :selected="selected"
            :opened="openedSlots"
            :blank="isBlank"
            @select="selectSlot"
            @trade="openTrade(null)"
            @cash="dialog = 'cash'"
            @settings="dialog = 'settings'"
            @import="dialog = 'import'"
            @export="dialog = 'export'"
            @reset="dialog = 'reset'"
        />

        <p v-if="error !== null" class="portfolio__error" role="alert">{{ error }}</p>

        <AppSpinner v-if="pending && summary === null" />

        <section v-else-if="summary === null" class="portfolio__empty">
            <h2 class="portfolio__empty-title">{{ t('portfolio.emptySlot') }}</h2>
            <p class="portfolio__empty-body">{{ t('portfolio.emptySlotHint') }}</p>
            <div class="portfolio__empty-actions">
                <button type="button" class="btn btn--primary" @click="dialog = 'cash'">
                    {{ t('portfolio.actions.deposit') }}
                </button>
                <button type="button" class="btn" @click="dialog = 'import'">{{ t('portfolio.import') }}</button>
            </div>
        </section>

        <template v-else>
            <SummaryCards :summary="summary" />

            <BenchmarkStrip :benchmarks="summary.benchmarks" @edit="dialog = 'benchmarks'" />

            <div class="portfolio__charts">
                <section class="portfolio__panel">
                    <h2 class="portfolio__panel-title">{{ t('portfolio.portfolioValue') }}</h2>
                    <LineChart
                        v-if="valuePoints.length > 0"
                        :points="valuePoints"
                        :label="t('portfolio.portfolioValue')"
                        :format="formatCurrency"
                    />
                    <p v-else class="form-hint">{{ t('portfolio.noActivity') }}</p>
                </section>

                <section class="portfolio__panel">
                    <h2 class="portfolio__panel-title">{{ t('portfolio.tradeReturns') }}</h2>
                    <BarChart
                        v-if="returnBins.length > 0"
                        :bars="returnBins"
                        :marker="summary.stats?.tradeReturnsChart.medianBinIndex ?? null"
                        :label="t('portfolio.tradeReturns')"
                        :format="(value) => formatNumber(value, 0)"
                    />
                    <p v-else class="form-hint">{{ t('portfolio.noClosedTrades') }}</p>
                </section>

                <section class="portfolio__panel">
                    <h2 class="portfolio__panel-title">{{ t('portfolio.diversification') }}</h2>
                    <DonutChart
                        v-if="allocation.length > 0"
                        :slices="allocation"
                        :label="t('portfolio.diversification')"
                    />
                    <p v-else class="form-hint">{{ t('portfolio.noPositionsAvailable') }}</p>
                </section>
            </div>

            <section class="portfolio__panel">
                <h2 class="portfolio__panel-title">{{ t('portfolio.positions') }}</h2>
                <PositionsTable
                    :positions="summary.positions"
                    :cash="summary.cash"
                    :quotes="quotes"
                    @close="closePosition"
                />
            </section>

            <section v-if="summary.stats !== null" class="portfolio__panel">
                <h2 class="portfolio__panel-title">{{ t('portfolio.performance') }}</h2>
                <StatsGrid :snapshot="summary.stats" />
            </section>

            <section class="portfolio__panel">
                <MonthlyPanel v-if="fullLog !== null" :value-history="summary.valueHistory" :trades="fullLog" />
                <button v-else type="button" class="btn" :disabled="loadingLog" @click="loadMonthly">
                    {{ loadingLog ? t('common.loading') : t('portfolio.monthlyPerformanceAnalysis') }}
                </button>
            </section>

            <section class="portfolio__panel">
                <TradeHistory
                    :trades="trades.items.value"
                    :total="trades.total.value"
                    :page="trades.page.value"
                    :page-count="trades.pageCount.value"
                    @edit="openTrade($event)"
                    @delete="tradeToDelete = $event"
                    @page="trades.goToPage($event)"
                />
            </section>
        </template>

        <TradeDialog
            v-if="dialog === 'trade'"
            :editing="tradeToEdit"
            :preset="tradePreset"
            :default-commission="summary?.defaultCommission ?? 0"
            :error="trades.error.value"
            :saving="saving"
            @close="dialog = null"
            @submit="submitTrade"
        />

        <CashDialog
            v-if="dialog === 'cash'"
            :error="trades.error.value"
            :saving="saving"
            @close="dialog = null"
            @submit="submitTrade"
        />

        <SettingsDialog
            v-if="dialog === 'settings' && summary !== null"
            :summary="summary"
            :error="error"
            :saving="saving"
            @close="dialog = null"
            @save-base-value="run(() => saveBaseValue($event))"
            @save-leverage="run(() => saveLeverage($event))"
            @save-commission="run(() => saveCommission($event))"
        />

        <BenchmarksDialog
            v-if="dialog === 'benchmarks' && summary !== null"
            :current="summary.benchmarks.map((entry) => entry.symbol)"
            :error="error"
            :saving="saving"
            @close="dialog = null"
            @save="run(async () => { await saveBenchmarks($event); dialog = null; })"
        />

        <ImportDialog
            v-if="dialog === 'import'"
            :error="error"
            :saving="saving"
            @close="dialog = null"
            @submit="submitImport"
        />

        <ExportDialog
            v-if="dialog === 'export'"
            :slot-number="selected"
            :load="exportCurrent"
            @close="dialog = null"
        />

        <ConfirmDialog
            v-if="dialog === 'reset'"
            :title="t('portfolio.resetPortfolio')"
            :message="t('portfolio.resetConfirmation')"
            :confirm-label="t('portfolio.yesReset')"
            :error="error"
            :pending="saving"
            @close="dialog = null"
            @confirm="confirmReset"
        />

        <ConfirmDialog
            v-if="tradeToDelete !== null"
            :title="t('portfolio.deleteTrade')"
            :message="t('portfolio.deleteTradeConfirmation')"
            :confirm-label="t('common.delete')"
            :error="trades.error.value"
            :pending="saving"
            @close="tradeToDelete = null"
            @confirm="confirmDeleteTrade"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TradeAction } from '@ereuna/shared';
import type { PortfolioImport, ValuedPosition } from '@/api/portfolio';
import type { TradeInput, TradeRow } from '@/api/trades';
import BenchmarkStrip from '@/components/portfolio/BenchmarkStrip.vue';
import BenchmarksDialog from '@/components/portfolio/BenchmarksDialog.vue';
import CashDialog from '@/components/portfolio/CashDialog.vue';
import ExportDialog from '@/components/portfolio/ExportDialog.vue';
import ImportDialog from '@/components/portfolio/ImportDialog.vue';
import MonthlyPanel from '@/components/portfolio/MonthlyPanel.vue';
import PortfolioTabs from '@/components/portfolio/PortfolioTabs.vue';
import PositionsTable from '@/components/portfolio/PositionsTable.vue';
import SettingsDialog from '@/components/portfolio/SettingsDialog.vue';
import StatsGrid from '@/components/portfolio/StatsGrid.vue';
import SummaryCards from '@/components/portfolio/SummaryCards.vue';
import TradeDialog from '@/components/portfolio/TradeDialog.vue';
import TradeHistory from '@/components/portfolio/TradeHistory.vue';
import AppSpinner from '@/components/ui/AppSpinner.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import BarChart, { type Bar } from '@/components/viz/BarChart.vue';
import DonutChart from '@/components/viz/DonutChart.vue';
import LineChart from '@/components/viz/LineChart.vue';
import { useLiveQuotes } from '@/composables/portfolio/useLiveQuotes';
import { usePortfolios } from '@/composables/portfolio/usePortfolios';
import { useTrades } from '@/composables/portfolio/useTrades';
import { useMarketStatus } from '@/composables/charts/useMarketStatus';
import { notifySuccess } from '@/composables/ui/useNotifications';
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters';

const { t } = useI18n();

const {
    selected,
    summary,
    pending,
    error,
    openedSlots,
    isBlank,
    heldSymbols,
    load,
    select,
    reload,
    saveBaseValue,
    saveLeverage,
    saveCommission,
    saveBenchmarks,
    reset,
    exportCurrent,
    importInto,
} = usePortfolios();

const trades = useTrades(() => selected.value, reload);

// Equity hours, with no crypto exemption: the aggregator gates its own
// publishing on the same schedule, so a socket held open outside them would
// receive nothing regardless of what is held.
const market = useMarketStatus(() => false);

// Quotes are only worth a socket while something is trading and something is
// held; outside those the last close is the price.
const { quotes } = useLiveQuotes(
    () => heldSymbols.value,
    () => market.status.value === 'open' && heldSymbols.value.length > 0,
);

type Dialog = 'trade' | 'cash' | 'settings' | 'benchmarks' | 'import' | 'export' | 'reset';

const dialog = ref<Dialog | null>(null);
const saving = ref(false);
const tradeToEdit = ref<TradeRow | null>(null);
const tradeToDelete = ref<TradeRow | null>(null);
const tradePreset = ref<{ action: TradeAction; symbol: string; shares: number } | null>(null);

/** The whole trade log, loaded on demand for the monthly breakdown. */
const fullLog = ref<TradeRow[] | null>(null);
const loadingLog = ref(false);

const valuePoints = computed(() =>
    (summary.value?.valueHistory ?? []).map((point) => ({ label: formatDate(point.date), value: point.value })),
);

const returnBins = computed<Bar[]>(() =>
    (summary.value?.stats?.tradeReturnsChart.bins ?? []).map((bin) => ({
        label: bin.range,
        // The bar's height is how many trades landed in the bin; its colour is
        // whether the bin itself is a gain, which the count cannot say.
        value: bin.count,
        positive: bin.positive,
    })),
);

const allocation = computed(() =>
    (summary.value?.positions ?? [])
        .filter((position) => position.marketValue !== null)
        .map((position) => ({ label: position.symbol, value: position.marketValue ?? 0 })),
);

async function selectSlot(slot: number): Promise<void> {
    // The blotter and the monthly log belong to the slot being left.
    fullLog.value = null;
    await select(slot);
    await trades.load();
}

/** Run a write with the dialogs' shared pending flag, swallowing the rejection
 *  the composable has already turned into a message. */
async function run(action: () => Promise<void>): Promise<void> {
    saving.value = true;
    try {
        await action();
    } catch {
        // `error` carries it; the dialog stays open so it can be read.
    } finally {
        saving.value = false;
    }
}

function openTrade(trade: TradeRow | null): void {
    tradeToEdit.value = trade;
    tradePreset.value = null;
    dialog.value = 'trade';
}

/** Closing a position is an ordinary trade with the opposite action filled in. */
function closePosition(position: ValuedPosition): void {
    tradeToEdit.value = null;
    tradePreset.value = {
        action: position.side === 'long' ? 'sell' : 'cover',
        symbol: position.symbol,
        shares: position.shares,
    };
    dialog.value = 'trade';
}

async function submitTrade(trade: TradeInput): Promise<void> {
    const editing = tradeToEdit.value;
    await run(async () => {
        if (editing === null) {
            await trades.create(trade);
        } else {
            await trades.update(editing.id, trade);
        }
        // The monthly breakdown was computed from a log that has just changed.
        fullLog.value = null;
        dialog.value = null;
        tradeToEdit.value = null;
    });
}

async function confirmDeleteTrade(): Promise<void> {
    const trade = tradeToDelete.value;
    if (trade === null) return;
    await run(async () => {
        await trades.remove(trade.id);
        fullLog.value = null;
        tradeToDelete.value = null;
    });
}

async function submitImport(payload: PortfolioImport): Promise<void> {
    await run(async () => {
        await importInto(payload);
        await trades.load();
        fullLog.value = null;
        dialog.value = null;
        notifySuccess(t('portfolio.portfolioImportedSuccess'));
    });
}

async function confirmReset(): Promise<void> {
    await run(async () => {
        await reset();
        await trades.load();
        fullLog.value = null;
        dialog.value = null;
        notifySuccess(t('portfolio.portfolioResetSuccess'));
    });
}

/**
 * The monthly breakdown needs every cash movement, not the page of trades on
 * screen — a deposit missed is a month that reports it as profit. The export
 * route is the only one that answers with the whole log, so it is loaded on
 * demand rather than on every visit.
 */
async function loadMonthly(): Promise<void> {
    loadingLog.value = true;
    try {
        const data = await exportCurrent();
        fullLog.value = data.trades;
    } catch {
        fullLog.value = null;
    } finally {
        loadingLog.value = false;
    }
}

onMounted(async () => {
    await Promise.all([load(), reload(), trades.load()]);
});
</script>

<style lang="scss" scoped>
.portfolio {
    display: flex;
    flex-direction: column;
    gap: 1em;
    padding: 1em;

    &__error {
        margin: 0;
        padding: 0.6em 0.9em;
        border: $border-width solid $color-negative;
        border-radius: $radius-sm;
        color: $color-negative;
        font-size: $font-size-sm;
    }

    &__empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5em;
        padding: 4em 1em;
        border: $border-width dashed $color-elevated;
        border-radius: $radius-md;
        text-align: center;
    }

    &__empty-title {
        margin: 0;
        font-size: $font-size-md;
        color: $color-text;
    }

    &__empty-body {
        margin: 0;
        font-size: $font-size-sm;
        color: $color-text-muted;
    }

    &__empty-actions {
        display: flex;
        gap: 0.5em;
        margin-top: 0.5em;
    }

    &__charts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
        gap: 1em;
    }

    &__panel {
        padding: 0.9em 1em;
        border: $border-width solid $color-elevated;
        border-radius: $radius-md;
        background: $color-surface;
    }

    &__panel-title {
        margin: 0 0 0.6em;
        font-size: $font-size-md;
        color: $color-text;
    }
}
</style>
