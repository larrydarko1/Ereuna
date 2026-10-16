<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { isList, isRecord } from '@ereuna/shared';

import AppDialog from '@/components/ui/AppDialog.vue';
import { targetOf } from '@/utils/dom';

const { error = null, saving } = defineProps<{
    error?: string | null;
    saving?: boolean;
}>();

const emit = defineEmits<{ close: []; submit: [json: string] }>();

const { t } = useI18n();

// The file is read only to say what it holds; what each trade says is the server's to judge
const chosen = ref<{ json: string; trades: number } | null>(null);
const problem = ref<string | null>(null);

const summary = computed(() => (chosen.value === null ? null : { trades: chosen.value.trades }));

async function onFile(event: Event): Promise<void> {
    chosen.value = null;
    problem.value = null;

    const file = targetOf(event, HTMLInputElement).files?.[0];
    if (file === undefined) return;

    try {
        const json = await file.text();
        const payload: unknown = JSON.parse(json);
        const trades = isRecord(payload) ? payload['trades'] : undefined;
        if (!isRecord(payload) || !isList(trades)) {
            problem.value = t('portfolio.importInvalid');
            return;
        }

        // Sent whole, settings included, so the incoming trades are judged by
        // the leverage they were traded at, not by this slot's default
        chosen.value = { json, trades: trades.length };
    } catch {
        problem.value = t('portfolio.importInvalid');
    }
}
</script>

<template>
    <AppDialog
        :title="t('portfolio.import')"
        size="sm"
        @close="emit('close')">
        <div class="import-dialog">
            <p class="form-hint">{{ t('portfolio.importHint') }}</p>

            <label class="form-field">
                <span class="form-label">{{ t('portfolio.importFile') }}</span>
                <input
                    class="form-input"
                    type="file"
                    accept="application/json,.json"
                    @change="onFile" />
            </label>

            <p
                v-if="summary !== null"
                class="import-dialog__summary">
                {{ t('portfolio.importSummary', { trades: summary.trades }) }}
            </p>

            <p
                v-if="problem !== null"
                class="form-error"
                role="alert"
                >{{ problem }}</p
            >
            <p
                v-else-if="error !== null"
                class="form-error"
                role="alert"
                >{{ error }}</p
            >
        </div>

        <template #footer>
            <button
                type="button"
                class="btn"
                @click="emit('close')"
                >{{ t('common.cancel') }}</button
            >
            <button
                type="button"
                class="btn btn--primary"
                :disabled="chosen === null || saving"
                @click="chosen !== null && emit('submit', chosen.json)">
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
