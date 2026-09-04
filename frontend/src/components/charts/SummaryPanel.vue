<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SummaryField } from '@ereuna/shared';
import SummaryRow from '@/components/charts/SummaryRow.vue';
import type { AssetProfile } from '@/api/chart';
import { SUMMARY_FIELD_SPECS } from '@/constants/summaryFields';

const { profile, fields } = defineProps<{
    profile: AssetProfile | null;
    fields: readonly SummaryField[];
}>();

const { t } = useI18n();

const rows = computed(() =>
    fields.map((field) => {
        const spec = SUMMARY_FIELD_SPECS[field];
        return {
            key: field,
            label: t(`summary.${spec.labelKey}`),
            format: spec.format,
            value: profile === null ? null : (profile[field] ?? null),
        };
    }),
);
</script>

<template>
    <div class="summary">
        <SummaryRow
            v-for="row in rows"
            :key="row.key"
            :label="row.label"
            :value="row.value"
            :format="row.format" />
    </div>
</template>

<style lang="scss" scoped>
.summary {
    display: flex;
    flex-direction: column;
}
</style>
