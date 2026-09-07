<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CorporateAction } from '@ereuna/shared';
import type { AssetProfile, ChartEvents } from '@/api/chart';
import { getFinancials } from '@/api/market';
import ActionsPanel from '@/components/charts/ActionsPanel.vue';
import FinancialsDialog from '@/components/charts/FinancialsDialog.vue';
import FinancialsPanel from '@/components/charts/FinancialsPanel.vue';
import NotesPanel from '@/components/charts/NotesPanel.vue';
import SidebarSection from '@/components/charts/SidebarSection.vue';
import SummaryPanel from '@/components/charts/SummaryPanel.vue';
import { usePanelLayout } from '@/composables/charts/usePanelLayout';
import { useResource } from '@/composables/data/useResource';

const {
    symbol,
    profile = null,
    events = null,
} = defineProps<{
    symbol: string;
    profile?: AssetProfile | null;
    events?: ChartEvents | null;
}>();

const { t } = useI18n();
const { sections, summaryFields } = usePanelLayout();

const showFinancials = ref(false);

// The whole history is read once for the view and each panel limits its own
// render, so nothing here decides how many rows a table shows
const dividends = computed<readonly CorporateAction[]>(() => events?.dividends ?? []);
const splits = computed<readonly CorporateAction[]>(() => events?.splits ?? []);

const financials = useResource(
    () => symbol,
    async (current) => (await getFinancials(current)).data,
    { enabled: (current): boolean => current !== '' },
);

const quarterly = computed<readonly Record<string, unknown>[]>(() => financials.data.value?.quarterly ?? []);
</script>

<template>
    <div class="sidebar">
        <template
            v-for="section in sections"
            :key="section">
            <SidebarSection :title="t(`sidebar.sections.${section}`)">
                <SummaryPanel
                    v-if="section === 'summary'"
                    :profile="profile"
                    :fields="summaryFields" />

                <FinancialsPanel
                    v-else-if="section === 'eps' || section === 'earnings' || section === 'sales'"
                    :rows="quarterly"
                    :metric="section" />

                <ActionsPanel
                    v-else-if="section === 'dividends'"
                    :actions="dividends"
                    kind="dividends" />

                <ActionsPanel
                    v-else-if="section === 'splits'"
                    :actions="splits"
                    kind="splits" />

                <button
                    v-else-if="section === 'financials'"
                    type="button"
                    class="sidebar__financials"
                    @click="showFinancials = true">
                    {{ t('sidebar.viewFinancialStatements') }}
                </button>

                <NotesPanel
                    v-else-if="section === 'notes'"
                    :symbol="symbol" />
            </SidebarSection>
        </template>

        <FinancialsDialog
            v-if="showFinancials"
            :symbol="symbol"
            :statements="financials.data.value"
            :pending="financials.pending.value"
            @close="showFinancials = false" />
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
