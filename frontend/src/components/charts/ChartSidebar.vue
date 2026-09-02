<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AssetProfile, ChartEvents } from '@/api/chart';
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

const { symbol, profile = null, events = null } = defineProps<{
    symbol: string;
    profile?: AssetProfile | null;
    events?: ChartEvents | null;
}>();

const { t } = useI18n();
const { sections, summaryFields } = usePanelLayout();

/** False until the user asks for the whole history rather than the last four. */
const allEvents = ref(false);
const showFinancials = ref(false);

/** How many of each action are shown before "show all". The API sends newest first. */
const DEFAULT_ACTIONS = 4;

const dividends = computed(() => visible(events?.dividends));
const splits = computed(() => visible(events?.splits));

function visible<T>(actions: readonly T[] | undefined): readonly T[] {
    const all = actions ?? [];
    return allEvents.value ? all : all.slice(0, DEFAULT_ACTIONS);
}

const financials = useResource(
    () => symbol,
    async (current) => (await getFinancials(current)).data,
    { enabled: (current) => current !== '' },
);

const quarterly = computed<readonly Record<string, unknown>[]>(() => financials.data.value?.quarterly ?? []);

/** Both action panels offer "show all" until the history is already on screen. */
const expandable = computed(
    () => !allEvents.value && (dividends.value.length > 0 || splits.value.length > 0),
);

// "Show all" was asked of one instrument, not of every instrument after it:
// a new symbol starts back at the four most recent.
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
                    :actions="dividends"
                    kind="dividends"
                    :expandable="expandable"
                    @expand="allEvents = true"
                />

                <ActionsPanel
                    v-else-if="section === 'splits'"
                    :actions="splits"
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
