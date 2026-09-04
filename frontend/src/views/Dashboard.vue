<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { getMarketStats } from '@/api/market';
import BreadthMeters from '@/components/dashboard/BreadthMeters.vue';
import CalendarPanel from '@/components/dashboard/CalendarPanel.vue';
import IndexTable from '@/components/dashboard/IndexTable.vue';
import MaBreadth from '@/components/dashboard/MaBreadth.vue';
import MarketClock from '@/components/dashboard/MarketClock.vue';
import MoversPanel from '@/components/dashboard/MoversPanel.vue';
import NewsFeed from '@/components/dashboard/NewsFeed.vue';
import OutlookPills from '@/components/dashboard/OutlookPills.vue';
import TierList from '@/components/dashboard/TierList.vue';
import ValuationPanel from '@/components/dashboard/ValuationPanel.vue';
import { useResource } from '@/composables/data/useResource';

const { t } = useI18n();

// One read feeds every panel below the fold. The summary is a single ingested
// document, so splitting it into per-panel requests would fetch it five times
const {
    data: overview,
    pending,
    error,
} = useResource(
    () => null,
    async () => (await getMarketStats()).data,
);
</script>

<template>
    <main
        class="dashboard"
        :aria-label="t('dashboard.title')">
        <!-- Header: the clock, the outlook and the breadth meters -->
        <header class="dashboard__header">
            <MarketClock :updated-at="overview?.updatedAt ?? null" />
            <OutlookPills
                v-if="overview !== null"
                :readings="overview.outlook" />
            <BreadthMeters
                v-if="overview !== null"
                :breadth="overview.breadth" />
        </header>

        <p
            v-if="pending"
            class="dashboard__note"
            >{{ t('dashboard.loading') }}</p
        >
        <p
            v-else-if="error !== null"
            class="dashboard__note"
            role="alert"
            >{{ error }}</p
        >

        <template v-else-if="overview !== null">
            <div class="dashboard__grid">
                <section class="dashboard__panel">
                    <h2 class="dashboard__title">{{ t('dashboard.indexes.title') }}</h2>
                    <IndexTable :indexes="overview.indexes" />
                </section>

                <section class="dashboard__panel">
                    <h2 class="dashboard__title">{{ t('dashboard.sma.title') }}</h2>
                    <MaBreadth :series="overview.movingAverages" />
                </section>

                <section class="dashboard__panel">
                    <h2 class="dashboard__title">{{ t('dashboard.movers.title') }}</h2>
                    <MoversPanel
                        :gainers="overview.gainers"
                        :losers="overview.losers" />
                </section>

                <section class="dashboard__panel">
                    <h2 class="dashboard__title">{{ t('dashboard.sectors.title') }}</h2>
                    <TierList :rows="overview.sectors" />
                </section>

                <section class="dashboard__panel dashboard__panel--wide">
                    <h2 class="dashboard__title">{{ t('dashboard.industries.title') }}</h2>
                    <TierList :rows="overview.industries" />
                </section>

                <section class="dashboard__panel dashboard__panel--wide">
                    <h2 class="dashboard__title">{{ t('dashboard.valuation.title') }}</h2>
                    <ValuationPanel
                        :undervalued="overview.undervalued"
                        :overvalued="overview.overvalued" />
                    <p class="dashboard__footnote">{{ t('dashboard.valuation.disclaimer') }}</p>
                </section>
            </div>
        </template>

        <!-- Below the summary: two panels that read on their own schedule -->
        <section class="dashboard__panel">
            <h2 class="dashboard__title">{{ t('dashboard.calendar.title') }}</h2>
            <CalendarPanel />
        </section>

        <section class="dashboard__panel">
            <h2 class="dashboard__title">{{ t('dashboard.news.title') }}</h2>
            <NewsFeed />
        </section>
    </main>
</template>

<style lang="scss" scoped>
.dashboard {
    display: flex;
    flex-direction: column;
    gap: 1em;
    padding: 1em;
}

.dashboard__header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1em;
    padding: 0.9em 1em;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;
}

.dashboard__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
    gap: 1em;
}

.dashboard__panel {
    padding: 0.9em 1em;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;
}

.dashboard__panel--wide {
    grid-column: 1 / -1;
}

.dashboard__title {
    margin: 0 0 0.6em;
    font-size: $font-size-md;
    color: $color-text;
}

.dashboard__footnote {
    margin: 0.6em 0 0;
    font-size: $font-size-xs;
    color: $color-text-muted;
}

.dashboard__note {
    margin: 0;
    padding: 1em;
    color: $color-text-muted;
    font-size: $font-size-sm;
}
</style>
