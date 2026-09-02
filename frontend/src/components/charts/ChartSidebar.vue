<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getEvents, type AssetProfile } from '@/api/chart';
import { getFinancials } from '@/api/market';
import ActionsPanel from '@/components/charts/ActionsPanel.vue';
import FinancialsDialog from '@/components/charts/FinancialsDialog.vue';
import FinancialsPanel from '@/components/charts/FinancialsPanel.vue';
import NewsPanel from '@/components/charts/NewsPanel.vue';
import NotesPanel from '@/components/charts/NotesPanel.vue';
import SidebarSection from '@/components/charts/SidebarSection.vue';
import SummaryPanel from '@/components/charts/SummaryPanel.vue';
import { usePanelLayout } from '@/composables/charts/usePanelLayout';
import { useResource } from '@/composables/data/useResource';

const { symbol, profile = null } = defineProps<{
    symbol: string;
    profile?: AssetProfile | null;
}>();

const { t } = useI18n();
const { sections, summaryFields } = usePanelLayout();

/** False until the user asks for the whole history rather than the last four. */
const allEvents = ref(false);
const showFinancials = ref(false);

const events = useResource(
    () => ({ symbol, all: allEvents.value }),
    async ({ symbol: current, all }) => (await getEvents(current, all)).data,
    { enabled: ({ symbol: current }) => current !== '' },
);

const financials = useResource(
    () => symbol,
    async (current) => (await getFinancials(current)).data,
    { enabled: (current) => current !== '' },
);

const quarterly = computed<readonly Record<string, unknown>[]>(() => financials.data.value?.quarterly ?? []);

/** Both action panels offer "show all" until the full history is loaded. */
const expandable = computed(() => !allEvents.value);

// "Show all" was asked of one instrument, not of every instrument after it: a
// new symbol starts back at the four most recent, and its full history is a
// read the user has to ask for again.
watch(
    () => symbol,
    () => {
        allEvents.value = false;
    },
);
</script>

<template>
    <div class="sidebar">
        <template v-for="section in sections" :key="section">
            <SidebarSection :title="t(`sidebar.sections.${section}`)">
                <SummaryPanel v-if="section === 'summary'" :profile="profile" :fields="summaryFields" />

                <FinancialsPanel
                    v-else-if="section === 'eps' || section === 'earnings' || section === 'sales'"
                    :rows="quarterly"
                    :metric="section"
                />

                <ActionsPanel
                    v-else-if="section === 'dividends'"
                    :actions="events.data.value?.dividends ?? []"
                    kind="dividends"
                    :expandable="expandable"
                    @expand="allEvents = true"
                />

                <ActionsPanel
                    v-else-if="section === 'splits'"
                    :actions="events.data.value?.splits ?? []"
                    kind="splits"
                    :expandable="expandable"
                    @expand="allEvents = true"
                />

                <button
                    v-else-if="section === 'financials'"
                    type="button"
                    class="sidebar__financials"
                    @click="showFinancials = true"
                >
                    {{ t('sidebar.viewFinancialStatements') }}
                </button>

                <NotesPanel v-else-if="section === 'notes'" :symbol="symbol" />

                <NewsPanel v-else-if="section === 'news'" :symbol="symbol" />
            </SidebarSection>
        </template>

        <FinancialsDialog
            v-if="showFinancials"
            :symbol="symbol"
            :statements="financials.data.value"
            :pending="financials.pending.value"
            @close="showFinancials = false"
        />
    </div>
</template>

<style lang="scss" scoped>
.sidebar {
    display: flex;
    flex-direction: column;
    gap: $space-2;
}

.sidebar__financials {
    width: 100%;
    padding: $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: none;
    color: $color-text;
    font-size: $font-size-sm;
    cursor: pointer;

    &:hover {
        border-color: $color-accent-1;
    }
}
</style>
