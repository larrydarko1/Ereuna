<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PortfolioImport } from '@/api/portfolio';
import AppDialog from '@/components/ui/AppDialog.vue';

const { error = null, saving = false } = defineProps<{
    error?: string | null;
    saving?: boolean;
}>();

const emit = defineEmits<{ close: []; submit: [payload: PortfolioImport] }>();

const { t } = useI18n();

const parsed = ref<PortfolioImport | null>(null);
const problem = ref<string | null>(null);

const summary = computed(() => (parsed.value === null ? null : { trades: parsed.value.trades.length }));

async function onFile(event: Event): Promise<void> {
    parsed.value = null;
    problem.value = null;

    const file = (event.target as HTMLInputElement).files?.[0];
    if (file === undefined) return;

    try {
        const payload: unknown = JSON.parse(await file.text());
        if (typeof payload !== 'object' || payload === null || !Array.isArray((payload as PortfolioImport).trades)) {
            problem.value = t('portfolio.importInvalid');
            return;
        }

        const envelope = payload as PortfolioImport;
        parsed.value = {
            trades: envelope.trades,
            // Settings are sent alongside so the incoming trades are judged by
            // the leverage they were traded at, not by this slot's default.
            ...(envelope.portfolio === undefined ? {} : { portfolio: envelope.portfolio }),
        };
    } catch {
        problem.value = t('portfolio.importInvalid');
    }
}
</script>

<template>
    <AppDialog :title="t('portfolio.import')" size="sm" @close="emit('close')">
        <div class="import-dialog">
            <p class="form-hint">{{ t('portfolio.importHint') }}</p>

            <label class="form-field">
                <span class="form-label">{{ t('portfolio.importFile') }}</span>
                <input class="form-input" type="file" accept="application/json,.json" @change="onFile" />
            </label>

            <p v-if="summary !== null" class="import-dialog__summary">
                {{ t('portfolio.importSummary', { trades: summary.trades }) }}
            </p>

            <p v-if="problem !== null" class="form-error" role="alert">{{ problem }}</p>
            <p v-else-if="error !== null" class="form-error" role="alert">{{ error }}</p>
        </div>

        <template #footer>
            <button type="button" class="btn" @click="emit('close')">{{ t('common.cancel') }}</button>
            <button
                type="button"
                class="btn btn--primary"
                :disabled="parsed === null || saving"
                @click="parsed !== null && emit('submit', parsed)"
            >
                {{ saving ? t('common.saving') : t('portfolio.import') }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.import-dialog {
    display: flex;
    flex-direction: column;
    gap: 0.75em;
}

.import-dialog__summary {
    margin: 0;
    font-size: $font-size-sm;
    color: $color-text;
}
</style>
