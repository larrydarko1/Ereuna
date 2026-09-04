<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getProfile } from '@/api/chart';
import { hideSymbol, unhideSymbol } from '@/api/preferences';
import { getCombinedResults, getScreenerResults, type FilterValue, type ScreenerResult } from '@/api/screener';
import PriceChart from '@/components/charts/PriceChart.vue';
import ColumnsDialog from '@/components/screener/ColumnsDialog.vue';
import FilterPanel from '@/components/screener/FilterPanel.vue';
import ResultsTable from '@/components/screener/ResultsTable.vue';
import ScreenerPicker from '@/components/screener/ScreenerPicker.vue';
import AppDialog from '@/components/ui/AppDialog.vue';
import PromptDialog from '@/components/ui/PromptDialog.vue';
import { useResource } from '@/composables/data/useResource';
import { loadPreferences, patchPreferences, usePreferences } from '@/composables/data/usePreferences';
import { useFilterRegistry } from '@/composables/screener/useFilterRegistry';
import { useScreenerFilters } from '@/composables/screener/useScreenerFilters';
import { useScreenerResults, type ResultsSource } from '@/composables/screener/useScreenerResults';
import { useScreeners } from '@/composables/screener/useScreeners';
import { notifyError, notifySuccess } from '@/composables/ui/useNotifications';
import { DEFAULT_COLUMNS, findColumn, readColumn } from '@/constants/screener';
import { CSV_TYPE, toCsv } from '@/utils/csv';
import { downloadFile } from '@/utils/download';

type Pane = 'filters' | 'results' | 'chart';
type ListMode = 'screener' | 'combined' | 'hidden';
type Dialog = 'create' | 'rename' | 'delete' | 'reset' | 'columns' | null;

/**
 * Export as far as the cap allows.
 * A loose screener matches tens of thousands of symbols, and walking every page
 * of that is a denial of service pointed at the user's own API. The cap is
 * stated on the button, so a truncated file is not a surprise.
 */
const EXPORT_LIMIT = 5000;
const EXPORT_PAGE = 200;

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
const dialog = ref<Dialog>(null);
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
    const usable = stored.filter((path) => findColumn(path) !== undefined);
    return usable.length > 0 ? usable : [...DEFAULT_COLUMNS];
});

const hiddenSymbols = computed(() => preferences.value?.hiddenSymbols ?? []);

const source = computed<ResultsSource>(() =>
    mode.value === 'combined' ? { kind: 'combined' } : { kind: 'screener', name: selected.value },
);

const results = useScreenerResults(
    () => source.value,
    () => revision.value,
);

/** The hidden list is the preference itself — there is no query behind it. */
const hiddenRows = computed<ScreenerResult[]>(() =>
    hiddenSymbols.value.map((symbol) => ({ symbol, name: null, assetType: null, sector: null, exchange: null })),
);

const rows = computed(() => (mode.value === 'hidden' ? hiddenRows.value : results.items.value));
const total = computed(() => (mode.value === 'hidden' ? hiddenSymbols.value.length : results.total.value));

const profile = useResource(
    () => selectedSymbol.value,
    async (symbol) => (await getProfile(symbol)).data,
    { enabled: (symbol) => symbol !== '' },
);

const exporting = ref(false);

const autoplay = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

/** A filter write changes both the matches and the picker's per-screener count. */
async function afterFilterChange(): Promise<void> {
    if (filters.error.value !== null) {
        notifyError(filters.error.value);
        return;
    }
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

async function toggleHidden(symbol: string): Promise<void> {
    const hidden = hiddenSymbols.value.includes(symbol);
    try {
        const { data } = hidden ? await unhideSymbol(symbol) : await hideSymbol(symbol);
        // The write already happened server-side; this only refreshes the copy
        // every other panel reads from.
        await patchPreferences({ hiddenSymbols: data.hiddenSymbols });
        revision.value += 1;
    } catch {
        notifyError(t('screener.hideFailed'));
    }
}

async function saveColumns(next: string[]): Promise<void> {
    dialog.value = null;
    try {
        await patchPreferences({ screenerColumns: next });
        revision.value += 1;
        notifySuccess(t('screener.columnsUpdated'));
    } catch {
        notifyError(t('screener.columnsFailed'));
    }
}

async function collectForExport(): Promise<ScreenerResult[]> {
    const collected: ScreenerResult[] = [];

    for (let page = 1; collected.length < EXPORT_LIMIT; page += 1) {
        const query = { page, limit: EXPORT_PAGE };
        const { data } =
            source.value.kind === 'combined'
                ? await getCombinedResults(query)
                : await getScreenerResults(source.value.name, query);

        collected.push(...data.items);
        if (page >= data.pages || data.items.length === 0) break;
    }

    return collected.slice(0, EXPORT_LIMIT);
}

async function exportCsv(): Promise<void> {
    if (mode.value === 'hidden') {
        downloadFile(
            'hidden.csv',
            toCsv([t('screener.symbol')], hiddenSymbols.value.map((symbol) => [symbol])),
            CSV_TYPE,
        );
        return;
    }

    exporting.value = true;
    try {
        const collected = await collectForExport();
        const headers = [
            t('screener.symbol'),
            t('screener.name'),
            ...columns.value.map((path) => t(`screener.fields.${findColumn(path)?.filterKey ?? path}`)),
        ];
        const body = collected.map((row) => [
            row.symbol,
            row.name,
            ...columns.value.map((path) => {
                const value = readColumn(row, path);
                return typeof value === 'string' || typeof value === 'number' ? value : null;
            }),
        ]);

        const name = mode.value === 'combined' ? t('screener.modes.combined') : selected.value;
        downloadFile(`${name}.csv`, toCsv(headers, body), CSV_TYPE);
    } catch {
        notifyError(t('screener.exportFailed'));
    } finally {
        exporting.value = false;
    }
}

// The chart follows the list: a screener whose first row was never selected
// left the chart pane empty, which was the old view's usual first impression.
watch(rows, (current) => {
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
        const index = rows.value.findIndex((row) => row.symbol === selectedSymbol.value);
        const next = rows.value[index + 1];
        if (next === undefined) {
            autoplay.value = false;
            return;
        }
        selectedSymbol.value = next.symbol;
    }, AUTOPLAY_MS);
});

onUnmounted(() => {
    if (timer !== undefined) clearInterval(timer);
});
</script>

<template>
    <div class="screener">
        <nav class="screener__tabs" :aria-label="t('screener.title')">
            <button
                v-for="option in (['filters', 'results', 'chart'] as const)"
                :key="option"
                type="button"
                class="screener__tab"
                :class="{ 'screener__tab--active': pane === option }"
                :aria-pressed="pane === option"
                @click="pane = option"
            >
                {{ t(`screener.panes.${option}`) }}
            </button>
        </nav>

        <div class="screener__grid">
            <aside class="screener__column screener__column--filters" :class="{ 'screener__column--hidden': pane !== 'filters' }">
                <ScreenerPicker
                    v-model="selected"
                    :items="screeners"
                    :included-count="includedCount"
                    :busy="screenersPending"
                    @create="dialog = 'create'"
                    @rename="dialog = 'rename'"
                    @remove="dialog = 'delete'"
                    @reset="dialog = 'reset'"
                    @toggle-include="setIncluded(selected, $event)"
                />

                <p v-if="registry.error.value !== null" class="screener__error" role="alert">
                    {{ registry.error.value }}
                    <button type="button" class="screener__retry" @click="registry.load()">{{ t('common.refresh') }}</button>
                </p>

                <FilterPanel
                    :groups="registry.grouped.value"
                    :value-for="filters.valueFor"
                    :saving="filters.saving.value"
                    :disabled="selected === ''"
                    @apply="applyFilter"
                    @clear="clearFilter"
                />
            </aside>

            <main class="screener__column screener__column--results" :class="{ 'screener__column--hidden': pane !== 'results' }">
                <header class="screener__toolbar">
                    <div class="screener__modes" role="group" :aria-label="t('screener.results')">
                        <button
                            v-for="option in (['screener', 'combined', 'hidden'] as const)"
                            :key="option"
                            type="button"
                            class="screener__mode"
                            :class="{ 'screener__mode--active': mode === option }"
                            :aria-pressed="mode === option"
                            @click="mode = option"
                        >
                            {{ t(`screener.modes.${option}`) }}
                        </button>
                    </div>

                    <span class="screener__count">{{ t('screener.resultsCount', { count: total }) }}</span>

                    <button type="button" class="screener__action" @click="dialog = 'columns'">
                        {{ t('screener.columnsTitle') }}
                    </button>
                    <button
                        type="button"
                        class="screener__action"
                        :disabled="exporting || total === 0"
                        :title="t('screener.exportHint', { max: EXPORT_LIMIT })"
                        @click="exportCsv"
                    >
                        {{ exporting ? t('screener.downloading') : t('common.download') }}
                    </button>
                    <button
                        type="button"
                        class="screener__action"
                        :class="{ 'screener__action--active': autoplay }"
                        :aria-pressed="autoplay"
                        @click="autoplay = !autoplay"
                    >
                        {{ t('screener.autoplay') }}
                    </button>
                </header>

                <p v-if="results.error.value !== null" class="screener__error" role="alert">{{ results.error.value }}</p>

                <p v-else-if="rows.length === 0 && !results.pending.value" class="screener__empty">
                    {{ mode === 'hidden' ? t('screener.noHidden') : t('screener.noResults') }}
                </p>

                <ResultsTable
                    v-else
                    :items="rows"
                    :columns="mode === 'hidden' ? [] : columns"
                    :selected="selectedSymbol"
                    :hidden-symbols="hiddenSymbols"
                    :pending="results.pending.value"
                    @select="selectedSymbol = $event"
                    @toggle-hidden="toggleHidden"
                />

                <nav v-if="mode !== 'hidden' && results.pages.value > 1" class="screener__pager" :aria-label="t('screener.results')">
                    <button
                        type="button"
                        class="screener__action"
                        :disabled="results.page.value <= 1"
                        @click="results.goTo(results.page.value - 1)"
                    >
                        {{ t('common.previous') }}
                    </button>
                    <span class="screener__page">
                        {{ t('common.pageOf', { page: results.page.value, pages: results.pages.value }) }}
                    </span>
                    <button
                        type="button"
                        class="screener__action"
                        :disabled="results.page.value >= results.pages.value"
                        @click="results.goTo(results.page.value + 1)"
                    >
                        {{ t('common.next') }}
                    </button>
                </nav>
            </main>

            <aside class="screener__column screener__column--chart" :class="{ 'screener__column--hidden': pane !== 'chart' }">
                <p v-if="selectedSymbol === ''" class="screener__empty">{{ t('screener.selectRow') }}</p>
                <PriceChart v-else :symbol="selectedSymbol" :profile="profile.data.value" />
            </aside>
        </div>

        <PromptDialog
            v-if="dialog === 'create'"
            :title="t('screener.createTitle')"
            :label="t('screener.nameLabel')"
            :max-length="20"
            :error="dialogError"
            @submit="runNamed(() => createScreener($event), 'screener.createFailed')"
            @close="dialog = null"
        />

        <PromptDialog
            v-else-if="dialog === 'rename'"
            :title="t('screener.renameTitle')"
            :label="t('screener.nameLabel')"
            :initial="selected"
            :max-length="20"
            :error="dialogError"
            @submit="runNamed(() => renameScreener($event), 'screener.renameFailed')"
            @close="dialog = null"
        />

        <AppDialog v-else-if="dialog === 'delete'" :title="t('screener.deleteTitle')" size="sm" @close="dialog = null">
            <p>{{ t('screener.deleteMessage', { name: selected }) }}</p>
            <template #footer>
                <button type="button" class="screener__action" @click="dialog = null">{{ t('common.cancel') }}</button>
                <button
                    type="button"
                    class="screener__action screener__action--danger"
                    @click="runNamed(() => removeScreener(selected), 'screener.deleteFailed')"
                >
                    {{ t('common.delete') }}
                </button>
            </template>
        </AppDialog>

        <AppDialog v-else-if="dialog === 'reset'" :title="t('screener.resetTitle')" size="sm" @close="dialog = null">
            <p>{{ t('screener.resetMessage') }}</p>
            <p class="screener__warning">{{ t('screener.resetWarning') }}</p>
            <template #footer>
                <button type="button" class="screener__action" @click="dialog = null">{{ t('common.cancel') }}</button>
                <button type="button" class="screener__action screener__action--danger" @click="resetFilters">
                    {{ t('screener.resetConfirm') }}
                </button>
            </template>
        </AppDialog>

        <ColumnsDialog v-else-if="dialog === 'columns'" :columns="columns" @save="saveColumns" @close="dialog = null" />
    </div>
</template>

<style lang="scss" scoped>
.screener {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    padding: $space-2;
}

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

.screener__toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
    align-items: center;
    padding: $space-2;
    border-bottom: $border-width solid $color-elevated;
}

.screener__modes {
    display: flex;
    gap: $space-1;
}

.screener__mode {
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-surface;
    color: $color-text-muted;
    font-family: inherit;
    font-size: $font-size-xs;
    cursor: pointer;
}

.screener__mode--active {
    background: $color-elevated;
    color: $color-text;
}

.screener__count {
    margin-right: auto;
    color: $color-text-muted;
    font-size: $font-size-xs;
    font-variant-numeric: tabular-nums;
}

.screener__action {
    padding: $space-1 $space-3;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-surface;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-xs;
    cursor: pointer;

    &:hover:not(:disabled) {
        background: $color-elevated;
    }

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
}

.screener__action--active {
    background: $color-elevated;
}

.screener__action--danger {
    border-color: $color-negative;
    color: $color-negative;
}

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

.screener__empty {
    margin: 0;
    padding: $space-5;
    color: $color-text-muted;
    font-size: $font-size-sm;
    text-align: center;
}

.screener__warning {
    color: $color-text-muted;
    font-size: $font-size-sm;
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
