<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TradeInput } from '@/api/trades';
import AppDialog from '@/components/ui/AppDialog.vue';
import { toDateInput } from '@/utils/formatters';

const { error = null, saving = false } = defineProps<{
    error?: string | null;
    saving?: boolean;
}>();

const emit = defineEmits<{ close: []; submit: [trade: TradeInput] }>();

const { t } = useI18n();

const action = ref<'deposit' | 'withdrawal'>('deposit');
const amount = ref('');
const tradeDate = ref(toDateInput(new Date()));

const valid = computed(() => Number(amount.value) > 0 && tradeDate.value !== '');

function submit(): void {
    if (!valid.value || saving) return;

    emit('submit', {
        action: action.value,
        // Explicitly null rather than omitted: the schema rejects a cash
        // movement that names an instrument, and null is what "none" means here.
        symbol: null,
        total: Number(amount.value),
        tradeDate: tradeDate.value,
    });
}
</script>

<template>
    <AppDialog :title="t('portfolio.cash')" @close="emit('close')">
        <form class="cash-dialog" @submit.prevent="submit">
            <fieldset class="form-options">
                <legend class="form-legend">{{ t('portfolio.action') }}</legend>
                <label class="form-option">
                    <input v-model="action" type="radio" value="deposit" name="cash-action" />
                    <span>{{ t('portfolio.actions.deposit') }}</span>
                </label>
                <label class="form-option">
                    <input v-model="action" type="radio" value="withdrawal" name="cash-action" />
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
                    autofocus
                />
            </label>

            <label class="form-field">
                <span class="form-label">{{ t('portfolio.date') }}</span>
                <input v-model="tradeDate" class="form-input" type="date" required />
            </label>

            <p class="form-hint">{{ t('portfolio.cashHint') }}</p>
            <p v-if="error !== null" class="form-error" role="alert">{{ error }}</p>
        </form>

        <template #footer>
            <button type="button" class="btn" @click="emit('close')">
                {{ t('common.cancel') }}
            </button>
            <button
                type="button"
                class="btn btn--primary"
                :disabled="!valid || saving"
                @click="submit"
            >
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
