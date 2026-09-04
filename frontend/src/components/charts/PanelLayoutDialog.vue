<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { PANEL_SECTIONS, SUMMARY_FIELDS, type PanelSection, type SummaryField } from '@ereuna/shared';
import { apiErrorMessage } from '@/api/client';
import AppDialog from '@/components/ui/AppDialog.vue';
import ReorderableList from '@/components/ui/ReorderableList.vue';
import { usePanelLayout } from '@/composables/charts/usePanelLayout';
import { SUMMARY_FIELD_SPECS } from '@/constants/summaryFields';

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { sections, summaryFields, save, reset } = usePanelLayout();

const tab = ref<'sections' | 'fields'>('sections');
const draftSections = ref<string[]>([...sections.value]);
const draftFields = ref<string[]>([...summaryFields.value]);
const saving = ref(false);
const error = ref<string | null>(null);

const sectionItems = PANEL_SECTIONS.map((section) => ({
    key: section,
    label: t(`sidebar.sections.${section}`),
}));

const fieldItems = SUMMARY_FIELDS.map((field) => ({
    key: field,
    label: t(`summary.${SUMMARY_FIELD_SPECS[field].labelKey}`),
}));

async function submit(): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
        await save({
            sections: draftSections.value as PanelSection[],
            summaryFields: draftFields.value as SummaryField[],
        });
        emit('close');
    } catch (err) {
        error.value = apiErrorMessage(err, t('panels.saveFailed'));
    } finally {
        saving.value = false;
    }
}

/** Back to the shipped order, in the draft. Nothing is stored until Save. */
function restoreDefaults(): void {
    draftSections.value = [...PANEL_SECTIONS];
    draftFields.value = [...SUMMARY_FIELDS];
}

async function clearStored(): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
        await reset();
        emit('close');
    } catch (err) {
        error.value = apiErrorMessage(err, t('panels.saveFailed'));
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AppDialog
        :title="t('panels.title')"
        size="md"
        @close="emit('close')">
        <div
            class="panel-layout__tabs"
            role="group"
            :aria-label="t('panels.title')">
            <button
                v-for="option in ['sections', 'fields'] as const"
                :key="option"
                type="button"
                class="panel-layout__tab"
                :class="{ 'panel-layout__tab--active': tab === option }"
                :aria-pressed="tab === option"
                @click="tab = option">
                {{ t(`panels.${option}`) }}
            </button>
        </div>

        <ReorderableList
            v-if="tab === 'sections'"
            v-model="draftSections"
            :items="sectionItems" />
        <ReorderableList
            v-else
            v-model="draftFields"
            :items="fieldItems" />

        <p
            v-if="error !== null"
            class="panel-layout__error"
            role="alert"
            >{{ error }}</p
        >

        <template #footer>
            <button
                type="button"
                class="panel-layout__link"
                :disabled="saving"
                @click="restoreDefaults">
                {{ t('panels.restoreDefaults') }}
            </button>
            <button
                type="button"
                class="panel-layout__link"
                :disabled="saving"
                @click="clearStored">
                {{ t('panels.forgetLayout') }}
            </button>
            <button
                type="button"
                class="panel-layout__save"
                :disabled="saving"
                @click="submit">
                {{ t('common.save') }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.panel-layout__tabs {
    display: flex;
    gap: $space-1;
    margin-bottom: $space-3;
}

.panel-layout__tab {
    padding: $space-1 $space-3;
    border: $border-width solid $color-elevated;
    border-radius: $radius-pill;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-xs;
    cursor: pointer;
}

.panel-layout__tab--active {
    border-color: $color-accent-1;
    color: $color-text;
}

.panel-layout__error {
    margin: $space-2 0 0;
    color: $color-negative;
    font-size: $font-size-sm;
}

.panel-layout__link {
    padding: 0;
    border: none;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-xs;
    cursor: pointer;

    &:hover:not(:disabled) {
        color: $color-text;
    }
}

.panel-layout__save {
    margin-left: auto;
    padding: $space-1 $space-4;
    border: none;
    border-radius: $radius-sm;
    background: $color-accent-1;
    color: $color-text-inverted;
    font-size: $font-size-sm;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}
</style>
