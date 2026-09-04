<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TradeAction } from '@ereuna/shared';
import type { TradeInput, TradeRow } from '@/api/trades';
import AppDialog from '@/components/ui/AppDialog.vue';
import AppField from '@/components/ui/AppField.vue';
import { formatCurrency, formatNumber, toDateInput } from '@/utils/formatters';

const {
    editing = null,
    preset = null,
    defaultCommission = 0,
    error = null,
    saving = false,
} = defineProps<{
    /** The trade being corrected, or null when recording a new one. */
    editing?: TradeRow | null;
    /** Opening state, used when closing a position from the holdings table. */
    preset?: { action: TradeAction; symbol: string; shares: number } | null;
    defaultCommission?: number;
    error?: string | null;
    saving?: boolean;
}>();

const emit = defineEmits<{ close: []; submit: [trade: TradeInput] }>();

/** Cash movements are recorded in their own dialog, so only the four equity
 *  actions are offered here. */
const ACTIONS: readonly TradeAction[] = ['buy', 'sell', 'short', 'cover'];

const { t } = useI18n();

const action = ref<TradeAction>(editing?.action ?? preset?.action ?? 'buy');
const symbol = ref(editing?.symbol ?? preset?.symbol ?? '');
const shares = ref(String(editing?.shares ?? preset?.shares ?? ''));
const price = ref(String(editing?.price ?? ''));
const commission = ref(editing === null ? '' : String(editing.commission));
const tradeDate = ref(toDateInput(editing?.tradeDate ?? new Date()));

const total = computed(() => (Number(shares.value) || 0) * (Number(price.value) || 0));

const valid = computed(
    () => symbol.value.trim() !== '' && Number(shares.value) > 0 && Number(price.value) > 0 && tradeDate.value !== '',
);

function submit(): void {
    if (!valid.value || saving) return;

    emit('submit', {
        action: action.value,
        symbol: symbol.value.trim().toUpperCase(),
        shares: Number(shares.value),
        price: Number(price.value),
        total: total.value,
        // An empty box means "use the portfolio's default", which the server
        // resolves to a number at write time. Sending 0 would mean free.
        ...(commission.value === '' ? {} : { commission: Number(commission.value) }),
        tradeDate: tradeDate.value,
    });
}
</script>

<template>
    <AppDialog :title="editing === null ? t('portfolio.newTrade') : t('portfolio.editTrade')" @close="emit('close')">
        <form class="trade-dialog" @submit.prevent="submit">
            <fieldset class="form-options">
                <legend class="form-legend">{{ t('portfolio.action') }}</legend>
                <label v-for="option in ACTIONS" :key="option" class="form-option">
                    <input v-model="action" type="radio" :value="option" name="trade-action" />
                    <span :class="`trade-dialog__action-label--${option}`">{{ t(`portfolio.actions.${option}`) }}</span>
                </label>
            </fieldset>

            <div class="trade-dialog__grid">
                <AppField v-model="symbol" :label="t('portfolio.symbol')" autofocus />

                <label class="form-field">
                    <span class="form-label">{{ t('portfolio.shares') }}</span>
                    <input v-model="shares" class="form-input" type="number" min="0" step="any" required />
                </label>

                <label class="form-field">
                    <span class="form-label">{{ t('portfolio.price') }}</span>
                    <input v-model="price" class="form-input" type="number" min="0" step="any" required />
                </label>

                <label class="form-field">
                    <span class="form-label">{{ t('portfolio.commission') }}</span>
                    <input
                        v-model="commission"
                        class="form-input"
                        type="number"
                        min="0"
                        step="any"
                        :placeholder="formatNumber(defaultCommission, 2)"
                    />
                </label>

                <label class="form-field">
                    <span class="form-label">{{ t('portfolio.date') }}</span>
                    <input v-model="tradeDate" class="form-input" type="date" required />
                </label>

                <div class="form-field">
                    <span class="form-label">{{ t('portfolio.total') }}</span>
                    <output class="form-output">{{ formatCurrency(total) }}</output>
                </div>
            </div>

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
.trade-dialog {
    display: flex;
    flex-direction: column;
    gap: 1em;

    // The four actions are colour-coded by what they do to the book: opening or
    // adding is one direction, closing or reducing the other.
}

.trade-dialog__action-label {
    &--buy,
    &--cover {
        color: $color-positive;
    }

    &--sell,
    &--short {
        color: $color-negative;
    }
}

.trade-dialog__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.75em;
}
</style>
