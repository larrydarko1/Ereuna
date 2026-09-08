<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getProfile } from '@/api/chart';
import { hideSymbol, unhideSymbol } from '@/api/preferences';
import type { FilterValue } from '@/api/screener';
import FilterPanel from '@/components/screener/FilterPanel.vue';
import ResultsTable from '@/components/screener/ResultsTable.vue';
import ResultsToolbar from '@/components/screener/ResultsToolbar.vue';
import ScreenerCharts from '@/components/screener/ScreenerCharts.vue';
import ScreenerDialogs from '@/components/screener/ScreenerDialogs.vue';
import ScreenerPicker from '@/components/screener/ScreenerPicker.vue';
import WatchlistDialog from '@/components/screener/WatchlistDialog.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { useResource } from '@/composables/data/useResource';
import { adoptPreferences, loadPreferences, patchPreferences, usePreferences } from '@/composables/data/usePreferences';
import { useFilterRegistry } from '@/composables/screener/useFilterRegistry';
import { EXPORT_LIMIT, useScreenerExport } from '@/composables/screener/useScreenerExport';
import { useScreenerFilters } from '@/composables/screener/useScreenerFilters';
import { useScreenerResults, type ResultsSource } from '@/composables/screener/useScreenerResults';
import { useScreeners } from '@/composables/screener/useScreeners';
import { DEFAULT_COLUMNS, findColumn, type ListMode, type ScreenerDialog } from '@/constants/screener';

type Pane = 'filters' | 'results' | 'chart';

/**
 * Autoplay walks the selection down the list so charts can be reviewed without
 * a hand on the keyboard. It stops at the end of the page rather than paging on:
 * a request on a timer nobody is watching is how the old view kept a tab busy
 * overnight.
 */
const AUTOPLAY_MS = 4000;

const { t } = useI18n();
const { preferences } = usePreferences();

const {
    items: screeners,
    selected,
    includedCount,
    pending: screenersPending,
    error: screenersError,
    load: loadScreeners,
    create: createScreener,
    rename: renameScreener,
    remove: removeScreener,
    setIncluded,
} = useScreeners();

const registry = useFilterRegistry();
const filters = useScreenerFilters(selected);

const pane = ref<Pane>('results');
const mode = ref<ListMode>('screener');
const dialog = ref<ScreenerDialog>(null);
const watchlistFor = ref<string | null>(null);
const selectedSymbol = ref('');
const dialogError = ref<string | null>(null);

/**
 * Bumped whenever something that changes the match set changes: a filter, the
 * chosen columns, or the hidden list. Results watch this rather than the filter
 * object, so one edit is one refetch even though a write replaces the whole set.
 */
const revision = ref(0);

const columns = computed(() => {
    const stored = preferences.value?.screenerColumns ?? [];
    const usable = stored.filter((path) => findColumn(path) !== null);
    return usable.length > 0 ? usable : [...DEFAULT_COLUMNS];
});

const hiddenSymbols = computed(() => preferences.value?.hiddenSymbols ?? []);

const source = computed<ResultsSource>(() => {
    if (mode.value === 'combined') return { kind: 'combined' };
    if (mode.value === 'hidden') return { kind: 'hidden' };
    return { kind: 'screener', name: selected.value };
});

const results = useScreenerResults(
    () => source.value,
    () => revision.value,
);

const profile = useResource(
    () => selectedSymbol.value,
    async (symbol) => (await getProfile(symbol)).data,
    { enabled: (symbol): boolean => symbol !== '' },
);

const exportCsv = useScreenerExport({
    source: (): ResultsSource => source.value,
    columns: (): readonly string[] => columns.value,
    filename: (): string => (mode.value === 'screener' ? selected.value : t(`screener.modes.${mode.value}`)),
});

/** The reason the last toolbar action failed, cleared by the next attempt. */
const actionError = ref<string | null>(null);

const autoplay = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

/** A filter write changes both the matches and the picker's per-screener count. */
async function afterFilterChange(): Promise<void> {
    if (filters.error.value !== null) return;
    revision.value += 1;
    await loadScreeners();
}

async function applyFilter(key: string, value: FilterValue): Promise<void> {
    await filters.set(key, value);
    await afterFilterChange();
}

async function clearFilter(key: string): Promise<void> {
    await filters.clear(key);
    await afterFilterChange();
}

async function resetFilters(): Promise<void> {
    dialog.value = null;
    await filters.clearAll();
    await afterFilterChange();
}

/** Run a screener mutation, keeping its dialog open with the reason if it fails. */
async function runNamed(action: () => Promise<void>, failure: string): Promise<void> {
    dialogError.value = null;
    try {
        await action();
        dialog.value = null;
    } catch {
        dialogError.value = screenersError.value ?? t(failure);
    }
}

/**
 * Chart the row, and remember it as the account's default symbol.
 * The screener is where a symbol is picked out; opening the chart view straight
 * afterwards and finding the previous one there is the reason this exists. The
 * write is fire-and-forget — the chart beside the table has already moved.
 */
function selectSymbol(symbol: string): void {
    selectedSymbol.value = symbol;
    if (symbol !== '') patchPreferences({ defaultSymbol: symbol }).catch(() => undefined);
}

async function toggleHidden(symbol: string): Promise<void> {
    const hidden = hiddenSymbols.value.includes(symbol);
    actionError.value = null;
    try {
        const { data } = hidden ? await unhideSymbol(symbol) : await hideSymbol(symbol);
        // The route owns this field and has already stored it, so the answer is
        // folded into the cache rather than sent back through PATCH — which does
        // not accept `hiddenSymbols` and refused every hide with a 422.
        adoptPreferences({ hiddenSymbols: data.hiddenSymbols });
        revision.value += 1;
    } catch {
        actionError.value = t('screener.hideFailed');
    }
}

async function saveColumns(next: string[]): Promise<void> {
    dialog.value = null;
    actionError.value = null;
    try {
        await patchPreferences({ screenerColumns: next });
        revision.value += 1;
    } catch {
        actionError.value = t('screener.columnsFailed');
    }
}

// The chart follows the list: a screener whose first row was never selected
// left the chart pane empty, which was the old view's usual first impression.
watch(results.items, (current) => {
    if (current.length === 0) {
        selectedSymbol.value = '';
        return;
    }
    if (!current.some((row) => row.symbol === selectedSymbol.value)) {
        selectedSymbol.value = current[0]?.symbol ?? '';
    }
});

onMounted(async () => {
    await Promise.all([loadPreferences(), registry.load(), loadScreeners()]);
});

watch(autoplay, (on) => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
    if (!on) return;

    timer = setInterval(() => {
        const index = results.items.value.findIndex((row) => row.symbol === selectedSymbol.value);
        const next = results.items.value[index + 1];
        if (next === undefined) {
            autoplay.value = false;
            return;
        }
        // Deliberately not `selectSymbol`: a timer must not rewrite the account
        // default four seconds at a time.
        selectedSymbol.value = next.symbol;
    }, AUTOPLAY_MS);
});

onUnmounted(() => {
    if (timer !== undefined) clearInterval(timer);
});
</script>

<template>
    <div class="screener">
        <nav
            class="screener__tabs"
            :aria-label="t('screener.title')">
            <button
                v-for="option in ['filters', 'results', 'chart'] as const"
                :key="option"
                type="button"
                class="screener__tab"
                :class="{ 'screener__tab--active': pane === option }"
                :aria-pressed="pane === option"
                @click="pane = option">
                {{ t(`screener.panes.${option}`) }}
            </button>
        </nav>

        <div class="screener__grid">
            <aside
                class="screener__column screener__column--filters"
                :class="{ 'screener__column--hidden': pane !== 'filters' }">
                <ScreenerPicker
                    v-model="selected"
                    :items="screeners"
                    :included-count="includedCount"
                    :busy="screenersPending"
                    @create="dialog = 'create'"
                    @rename="dialog = 'rename'"
                    @remove="dialog = 'delete'"
                    @reset="dialog = 'reset'"
                    @toggle-include="setIncluded(selected, { include: $event })" />

                <p
                    v-if="registry.error.value !== null"
                    class="screener__error"
                    role="alert">
                    {{ registry.error.value }}
                    <button
                        type="button"
                        class="screener__retry"
                        @click="registry.load()"
                        >{{ t('common.refresh') }}</button
                    >
                </p>

                <p
                    v-if="filters.error.value !== null"
                    class="screener__error"
                    role="alert"
                    >{{ filters.error.value }}</p
                >

                <FilterPanel
                    :groups="registry.grouped.value"
                    :value-for="filters.valueFor"
                    :saving="filters.saving.value"
                    :disabled="selected === ''"
                    @apply="applyFilter"
                    @clear="clearFilter" />
            </aside>

            <main
                class="screener__column screener__column--results"
                :class="{ 'screener__column--hidden': pane !== 'results' }">
                <ResultsToolbar
                    v-model:mode="mode"
                    v-model:autoplay="autoplay"
                    :total="results.total.value"
                    :export-limit="EXPORT_LIMIT"
                    :exporting="exportCsv.exporting.value"
                    @columns="dialog = 'columns'"
                    @export="exportCsv.run()" />

                <p
                    v-if="actionError !== null || exportCsv.error.value !== null"
                    class="screener__error"
                    role="alert"
                    >{{ actionError ?? exportCsv.error.value }}</p
                >

                <p
                    v-if="results.error.value !== null"
                    class="screener__error"
                    role="alert"
                    >{{ results.error.value }}</p
                >

                <!-- No screener yet is a slot to fill, not a query that matched nothing -->
                <EmptyState
                    v-else-if="screeners.length === 0 && !screenersPending"
                    :title="t('screener.emptyTitle')"
                    :body="t('screener.emptyHint')">
                    <button
                        type="button"
                        class="btn btn--primary"
                        @click="dialog = 'create'">
                        {{ t('screener.createFirst') }}
                    </button>
                </EmptyState>

                <EmptyState
                    v-else-if="results.items.value.length === 0 && !results.pending.value"
                    :title="mode === 'hidden' ? t('screener.noHidden') : t('screener.noResults')"
                    :body="mode === 'hidden' ? t('screener.noHiddenHint') : t('screener.noResultsHint')" />

                <ResultsTable
                    v-else
                    :items="results.items.value"
                    :columns="columns"
                    :selected="selectedSymbol"
                    :hidden-symbols="hiddenSymbols"
                    :pending="results.pending.value"
                    @select="selectSymbol"
                    @toggle-hidden="toggleHidden"
                    @watchlist="watchlistFor = $event" />

                <nav
                    v-if="results.pages.value > 1"
                    class="screener__pager"
                    :aria-label="t('screener.results')">
                    <button
                        type="button"
                        class="btn btn--small"
                        :disabled="results.page.value <= 1"
                        @click="results.goTo(results.page.value - 1)">
                        {{ t('common.previous') }}
                    </button>
                    <span class="screener__page">
                        {{ t('common.pageOf', { page: results.page.value, pages: results.pages.value }) }}
                    </span>
                    <button
                        type="button"
                        class="btn btn--small"
                        :disabled="results.page.value >= results.pages.value"
                        @click="results.goTo(results.page.value + 1)">
                        {{ t('common.next') }}
                    </button>
                </nav>
            </main>

            <aside
                class="screener__column screener__column--chart"
                :class="{ 'screener__column--hidden': pane !== 'chart' }">
                <ScreenerCharts
                    :symbol="selectedSymbol"
                    :profile="profile.data.value" />
            </aside>
        </div>

        <ScreenerDialogs
            :dialog="dialog"
            :selected="selected"
            :columns="columns"
            :error="dialogError"
            @close="dialog = null"
            @create="runNamed(() => createScreener($event), 'screener.createFailed')"
            @rename="runNamed(() => renameScreener($event), 'screener.renameFailed')"
            @remove="runNamed(() => removeScreener(selected), 'screener.deleteFailed')"
            @reset="resetFilters"
            @save-columns="saveColumns" />

        <WatchlistDialog
            v-if="watchlistFor !== null"
            :symbol="watchlistFor"
            @close="watchlistFor = null" />
    </div>
</template>

<style lang="scss" scoped>
/* –––––– Frame –––––– */

.screener {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    padding: $space-2;
}

/* –––––– Pane switcher –––––– */

.screener__tabs {
    display: flex;
    gap: $space-1;

    @include above($bp-lg) {
        display: none;
    }
}

.screener__tab {
    flex: 1;
    padding: $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-surface;
    color: $color-text-muted;
    font-family: inherit;
    font-size: $font-size-sm;
    cursor: pointer;
}

.screener__tab--active {
    background: $color-elevated;
    color: $color-text;
}

/* –––––– Columns –––––– */

.screener__grid {
    display: grid;
    gap: $space-2;

    @include above($bp-lg) {
        grid-template-columns: 20rem minmax(0, 1fr) minmax(0, 1fr);
        align-items: start;
    }
}

.screener__column {
    min-width: 0;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;

    @include above($bp-lg) {
        display: block;
    }
}

.screener__column--hidden {
    display: none;

    @include above($bp-lg) {
        display: block;
    }
}

.screener__column--filters {
    max-height: 80vh;
    overflow-y: auto;
}

.screener__column--results {
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    overflow: hidden;
}

.screener__column--chart {
    padding: $space-2;
}

/* –––––– Messages and paging –––––– */

.screener__error {
    margin: 0;
    padding: $space-3;
    color: $color-negative;
    font-size: $font-size-sm;
}

.screener__retry {
    margin-left: $space-2;
    border: none;
    background: none;
    color: $color-accent-1;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
}

.screener__pager {
    display: flex;
    gap: $space-2;
    align-items: center;
    justify-content: center;
    padding: $space-2;
    border-top: $border-width solid $color-elevated;
}

.screener__page {
    color: $color-text-muted;
    font-size: $font-size-xs;
    font-variant-numeric: tabular-nums;
}
</style>
