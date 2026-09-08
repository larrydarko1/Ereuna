<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from '@/components/ui/AppDialog.vue';

const {
    summary,
    error = null,
    saving = false,
} = defineProps<{
    summary: { baseValue: number; leverage: number; defaultCommission: number };
    error?: string | null;
    saving?: boolean;
}>();

const emit = defineEmits<{
    'close': [];
    'save-base-value': [value: number];
    'save-leverage': [value: number];
    'save-commission': [value: number];
}>();

/** Mirrors the API's own ceiling; the server refuses anything above it. */
const MAX_LEVERAGE = 10;

const { t } = useI18n();

const baseValue = ref(String(summary.baseValue));
const leverage = ref(String(summary.leverage));
const commission = ref(String(summary.defaultCommission));
</script>

<template>
    <AppDialog
        :title="t('portfolio.settings')"
        size="sm"
        @close="emit('close')">
        <div class="settings-dialog">
            <section class="settings-dialog__row">
                <label class="form-field">
                    <span class="form-label">{{ t('portfolio.baseValue') }}</span>
                    <input
                        v-model="baseValue"
                        class="form-input"
                        type="number"
                        min="0"
                        step="any" />
                </label>
                <p class="form-hint">{{ t('portfolio.baseValueHint') }}</p>
                <button
                    type="button"
                    class="btn"
                    :disabled="saving"
                    @click="emit('save-base-value', Number(baseValue))">
                    {{ t('common.save') }}
                </button>
            </section>

            <section class="settings-dialog__row">
                <label class="form-field">
                    <span class="form-label">{{ t('portfolio.leverage') }}</span>
                    <input
                        v-model="leverage"
                        class="form-input"
                        type="number"
                        min="1"
                        :max="MAX_LEVERAGE"
                        step="0.1" />
                </label>
                <p class="form-hint">{{ t('portfolio.leverageHint') }}</p>
                <button
                    type="button"
                    class="btn"
                    :disabled="saving"
                    @click="emit('save-leverage', Number(leverage))">
                    {{ t('common.save') }}
                </button>
            </section>

            <section class="settings-dialog__row">
                <label class="form-field">
                    <span class="form-label">{{ t('portfolio.defaultCommission') }}</span>
                    <input
                        v-model="commission"
                        class="form-input"
                        type="number"
                        min="0"
                        step="any" />
                </label>
                <p class="form-hint">{{ t('portfolio.commissionHint') }}</p>
                <button
                    type="button"
                    class="btn"
                    :disabled="saving"
                    @click="emit('save-commission', Number(commission))">
                    {{ t('common.save') }}
                </button>
            </section>

            <p
                v-if="error !== null"
                class="form-error"
                role="alert"
                >{{ error }}</p
            >
        </div>
    </AppDialog>
</template>

<style lang="scss" scoped>
.settings-dialog {
    display: flex;
    flex-direction: column;
    gap: 1.5em;
}

.settings-dialog__row {
    display: flex;
    flex-direction: column;

    // Each setting saves on its own, so each gets its own button rather
    // than one that would send three writes the user did not all make.
    align-items: flex-start;
    gap: 0.4em;
}
</style>
