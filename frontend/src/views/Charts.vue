<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getEvents, getProfile } from '@/api/chart';
import ChartSidebar from '@/components/charts/ChartSidebar.vue';
import PanelLayoutDialog from '@/components/charts/PanelLayoutDialog.vue';
import PriceChart from '@/components/charts/PriceChart.vue';
import SymbolSearch from '@/components/charts/SymbolSearch.vue';
import WatchlistPanel from '@/components/charts/WatchlistPanel.vue';
import AssetLogo from '@/components/ui/AssetLogo.vue';
import { useChartSymbol } from '@/composables/charts/useChartSymbol';
import { useResource } from '@/composables/data/useResource';
import { loadPreferences } from '@/composables/data/usePreferences';

type Pane = 'info' | 'chart' | 'watchlist';

const { t } = useI18n();
const { symbol, select, canonicalize } = useChartSymbol();

/** Which pane the phone layout shows. Ignored once there is room for all three. */
const pane = ref<Pane>('chart');
const editingLayout = ref(false);

const profile = useResource(
    () => symbol.value,
    async (current) => (await getProfile(current)).data,
    { enabled: (current): boolean => current !== '' },
);

/**
 * The corporate-action history, read once for the whole view.
 * The chart marks every dividend and split on the time axis and the sidebar
 * lists the most recent of each, so they share one request rather than asking
 * for the same history twice with different limits.
 */
const events = useResource(
    () => symbol.value,
    async (current) => (await getEvents(current, true)).data,
    { enabled: (current): boolean => current !== '' },
);

const title = computed(() => profile.data.value?.name ?? symbol.value);

onMounted(async () => {
    // A bare /charts has no symbol until the account default arrives; once it
    // does, the URL is rewritten so the page can be linked to and reloaded.
    await loadPreferences();
    await canonicalize();
});
</script>

<template>
    <div class="charts">
        <nav
            class="charts__tabs"
            :aria-label="t('charts.title')">
            <button
                v-for="option in ['info', 'chart', 'watchlist'] as const"
                :key="option"
                type="button"
                class="charts__tab"
                :class="{ 'charts__tab--active': pane === option }"
                :aria-pressed="pane === option"
                @click="pane = option">
                {{ t(`charts.panes.${option}`) }}
            </button>
        </nav>

        <div class="charts__grid">
            <aside
                class="charts__column charts__column--info"
                :class="{ 'charts__column--hidden': pane !== 'info' }">
                <button
                    type="button"
                    class="charts__edit"
                    @click="editingLayout = true">
                    {{ t('panels.title') }}
                </button>
                <ChartSidebar
                    :symbol="symbol"
                    :profile="profile.data.value"
                    :events="events.data.value" />
            </aside>

            <main
                class="charts__column charts__column--chart"
                :class="{ 'charts__column--hidden': pane !== 'chart' }">
                <header class="charts__header">
                    <AssetLogo
                        :symbol="symbol"
                        :exchange="profile.data.value?.exchange ?? null" />
                    <div class="charts__identity">
                        <h1 class="charts__symbol">{{ symbol }}</h1>
                        <p class="charts__name">{{ title }}</p>
                    </div>
                    <SymbolSearch
                        class="charts__search"
                        @select="select" />
                </header>

                <p
                    v-if="profile.error.value !== null"
                    class="charts__error"
                    role="alert">
                    {{ profile.error.value }}
                </p>

                <PriceChart
                    :symbol="symbol"
                    :profile="profile.data.value"
                    :events="events.data.value"
                    class="charts__canvas" />
            </main>

            <aside
                class="charts__column charts__column--watchlist"
                :class="{ 'charts__column--hidden': pane !== 'watchlist' }">
                <WatchlistPanel
                    :symbol="symbol"
                    @select="select" />
            </aside>
        </div>

        <PanelLayoutDialog
            v-if="editingLayout"
            @close="editingLayout = false" />
    </div>
</template>

<style lang="scss" scoped>
.charts {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    padding: $space-2;
}

.charts__tabs {
    display: flex;
    gap: $space-1;

    // Three columns at once make the switcher pointless.
    @include above($bp-lg) {
        display: none;
    }
}

.charts__tab {
    flex: 1;
    padding: $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-sm;
    cursor: pointer;
}

.charts__tab--active {
    border-color: $color-accent-1;
    color: $color-text;
}

.charts__grid {
    display: grid;
    gap: $space-2;

    @include above($bp-lg) {
        grid-template-columns: 20rem minmax(0, 1fr) 18rem;
        align-items: start;
    }
}

.charts__column--hidden {
    display: none;

    @include above($bp-lg) {
        display: block;
    }
}

.charts__header {
    display: flex;
    gap: $space-2;
    align-items: center;
    margin-bottom: $space-2;
}

.charts__identity {
    min-width: 0;
}

.charts__symbol {
    margin: 0;
    font-size: $font-size-lg;
}

.charts__name {
    margin: 0;
    overflow: hidden;
    color: $color-text-muted;
    font-size: $font-size-xs;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.charts__search {
    flex: 1;
    min-width: 0;
    margin-left: auto;
    max-width: 320px;
}

.charts__edit {
    width: 100%;
    margin-bottom: $space-2;
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-xs;
    cursor: pointer;

    &:hover {
        color: $color-text;
    }
}

.charts__error {
    margin: 0 0 $space-2;
    color: $color-negative;
    font-size: $font-size-sm;
}

.charts__canvas {
    flex: 1;
    min-height: 384px;
}
</style>
