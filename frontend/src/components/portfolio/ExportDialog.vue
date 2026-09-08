<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiErrorMessage } from '@/api/client';
import type { PortfolioExport } from '@/api/portfolio';
import AppDialog from '@/components/ui/AppDialog.vue';
import { CSV_TYPE, toCsv } from '@/utils/csv';
import { downloadFile } from '@/utils/download';

const { slotNumber, load } = defineProps<{
    /** 0-based, but named for the user in the filename. */
    slotNumber: number;
    load: () => Promise<PortfolioExport>;
}>();

const emit = defineEmits<{ close: [] }>();

const CSV_COLUMNS = ['tradeDate', 'action', 'symbol', 'shares', 'price', 'commission', 'total'] as const;

const { t } = useI18n();

const format = ref<'json' | 'csv'>('json');
const busy = ref(false);
const problem = ref<string | null>(null);

async function download(): Promise<void> {
    busy.value = true;
    problem.value = null;

    try {
        // Fetched at download time rather than held: the export route answers
        // with the whole log, which is the point, and it may have changed since
        // the dialog opened.
        const data = await load();

        const body =
            format.value === 'json'
                ? JSON.stringify(data, null, 2)
                : toCsv(
                      [...CSV_COLUMNS],
                      data.trades.map((trade) => [
                          trade.tradeDate,
                          trade.action,
                          trade.symbol ?? '',
                          trade.shares ?? '',
                          trade.price ?? '',
                          trade.commission ?? '',
                          trade.total,
                      ]),
                  );

        downloadFile(
            `ereuna-portfolio-${slotNumber + 1}.${format.value}`,
            body,
            format.value === 'json' ? 'application/json' : CSV_TYPE,
        );
        emit('close');
    } catch (err) {
        problem.value = apiErrorMessage(err, t('errors.INTERNAL'));
    } finally {
        busy.value = false;
    }
}
</script>

<template>
    <AppDialog
        :title="t('portfolio.export')"
        size="sm"
        @close="emit('close')">
        <div class="export-dialog">
            <fieldset class="form-options">
                <legend class="form-legend">{{ t('portfolio.exportFormat') }}</legend>
                <label class="form-option">
                    <input
                        v-model="format"
                        type="radio"
                        value="json"
                        name="export-format" />
                    <span>{{ t('portfolio.exportJson') }}</span>
                </label>
                <label class="form-option">
                    <input
                        v-model="format"
                        type="radio"
                        value="csv"
                        name="export-format" />
                    <span>{{ t('portfolio.exportCsv') }}</span>
                </label>
            </fieldset>

            <p class="form-hint">
                {{ format === 'json' ? t('portfolio.exportJsonHint') : t('portfolio.exportCsvHint') }}
            </p>

            <p
                v-if="problem !== null"
                class="form-error"
                role="alert"
                >{{ problem }}</p
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
                :disabled="busy"
                @click="download">
                {{ busy ? t('common.processing') : t('common.download') }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.export-dialog {
    display: flex;
    flex-direction: column;
    gap: 0.75em;
}
</style>
