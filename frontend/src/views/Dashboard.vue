<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { getMarketStats } from '@/api/market';
import BreadthMeters from '@/components/dashboard/BreadthMeters.vue';
import IndexTable from '@/components/dashboard/IndexTable.vue';
import MaBreadth from '@/components/dashboard/MaBreadth.vue';
import MarketClock from '@/components/dashboard/MarketClock.vue';
import MoversPanel from '@/components/dashboard/MoversPanel.vue';
import OutlookPills from '@/components/dashboard/OutlookPills.vue';
import TierList from '@/components/dashboard/TierList.vue';
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
            </div>

            <!-- Sector and industry read as one comparison, so they share a row of their own -->
            <div class="dashboard__grid dashboard__grid--pair">
                <section class="dashboard__panel">
                    <h2 class="dashboard__title">{{ t('dashboard.sectors.title') }}</h2>
                    <TierList :rows="overview.sectors" />
                </section>

                <section class="dashboard__panel">
                    <h2 class="dashboard__title">{{ t('dashboard.industries.title') }}</h2>
                    <TierList :rows="overview.industries" />
                </section>
            </div>
        </template>
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

// Two columns exactly, not auto-fit: the pair is a comparison and auto-fit
// would drop industry onto its own row at any width that fits three panels
.dashboard__grid--pair {
    @include above($bp-lg) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

.dashboard__panel {
    padding: 0.9em 1em;
    border: $border-width solid $color-elevated;
    border-radius: $radius-md;
    background: $color-surface;
}

.dashboard__title {
    margin: 0 0 0.6em;
    font-size: $font-size-md;
    color: $color-text;
}

.dashboard__note {
    margin: 0;
    padding: 1em;
    color: $color-text-muted;
    font-size: $font-size-sm;
}
</style>
