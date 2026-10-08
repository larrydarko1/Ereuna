<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { CASH_ACTIONS, isOneOf } from '@ereuna/shared';
import type { CashAction, TradeInput, TradeRow } from '@ereuna/shared';

import AppDialog from '@/components/ui/AppDialog.vue';
import { toDateInput } from '@/utils/formatters';

const {
    editing = null,
    error = null,
    saving = false,
} = defineProps<{
    /** The cash movement being corrected, or null when recording a new one. */
    editing?: TradeRow | null;
    error?: string | null;
    saving?: boolean;
}>();

const emit = defineEmits<{ close: []; submit: [trade: TradeInput] }>();

const { t } = useI18n();

const action = ref<CashAction>(startingAction());
const amount = ref(editing === null ? '' : String(editing.total));
const tradeDate = ref(toDateInput(editing?.tradeDate ?? new Date()));

const valid = computed(() => Number(amount.value) > 0 && tradeDate.value !== '');

function submit(): void {
    if (!valid.value || saving) return;

    emit('submit', {
        action: action.value,
        total: Number(amount.value),
        tradeDate: tradeDate.value,
    });
}

function startingAction(): CashAction {
    const wanted = editing?.action ?? 'deposit';
    if (!isOneOf(CASH_ACTIONS, wanted)) throw new Error('A trade is corrected in the trade dialog');
    return wanted;
}
</script>

<template>
    <AppDialog
        :title="t('portfolio.cash')"
        @close="emit('close')">
        <form
            class="cash-dialog"
            @submit.prevent="submit">
            <fieldset class="form-options">
                <legend class="form-legend">{{ t('portfolio.action') }}</legend>
                <label class="form-option">
                    <input
                        v-model="action"
                        type="radio"
                        value="deposit"
                        name="cash-action" />
                    <span>{{ t('portfolio.actions.deposit') }}</span>
                </label>
                <label class="form-option">
                    <input
                        v-model="action"
                        type="radio"
                        value="withdrawal"
                        name="cash-action" />
                    <span>{{ t('portfolio.actions.withdrawal') }}</span>
                </label>
            </fieldset>

            <label class="form-field">
                <span class="form-label">{{ t('portfolio.amount') }}</span>
                <input
                    v-model="amount"
                    class="form-input"
                    type="number"
                    min="0"
                    step="any"
                    required
                    autofocus />
            </label>

            <label class="form-field">
                <span class="form-label">{{ t('portfolio.date') }}</span>
                <input
                    v-model="tradeDate"
                    class="form-input"
                    type="date"
                    required />
            </label>

            <p class="form-hint">{{ t('portfolio.cashHint') }}</p>
            <p
                v-if="error !== null"
                class="form-error"
                role="alert"
                >{{ error }}</p
            >
        </form>

        <template #footer>
            <button
                type="button"
                class="btn"
                @click="emit('close')">
                {{ t('common.cancel') }}
            </button>
            <button
                type="button"
                class="btn btn--primary"
                :disabled="!valid || saving"
                @click="submit">
                {{ saving ? t('common.saving') : t('common.save') }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.cash-dialog {
    display: flex;
    flex-direction: column;
    gap: 1em;
}
</style>
