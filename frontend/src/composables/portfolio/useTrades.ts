/** useTrades — the blotter, and the three writes that change a portfolio. */
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { apiErrorMessage } from '@/api/client';
import { addTrade, deleteTrade, listTrades, updateTrade, type TradeInput, type TradeRow } from '@/api/trades';
import { i18n } from '@/i18n';

export type UseTradesReturn = {
    items: Ref<TradeRow[]>;
    total: Ref<number>;
    page: Ref<number>;
    pageCount: ComputedRef<number>;
    pending: Ref<boolean>;
    error: Ref<string | null>;
    load: () => Promise<void>;
    goToPage: (page: number) => Promise<void>;
    create: (trade: TradeInput) => Promise<void>;
    update: (id: string, trade: TradeInput) => Promise<void>;
    remove: (id: string) => Promise<void>;
};

const PAGE_SIZE = 50;

export function useTrades(portfolio: () => number, onWrite: () => Promise<void> | void): UseTradesReturn {
    const items = ref<TradeRow[]>([]);
    const total = ref(0);
    const page = ref(1);
    const pending = ref(false);
    const error = ref<string | null>(null);

    let sequence = 0;

    const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));

    async function load(): Promise<void> {
        const ticket = (sequence += 1);
        pending.value = true;
        error.value = null;

        try {
            const { data } = await listTrades(portfolio(), { page: page.value, limit: PAGE_SIZE });
            if (ticket !== sequence) return;
            items.value = data.items;
            total.value = data.total;
        } catch (err) {
            if (ticket !== sequence) return;
            items.value = [];
            total.value = 0;
            error.value = apiErrorMessage(err, i18n.global.t('errors.INTERNAL'));
        } finally {
            if (ticket === sequence) pending.value = false;
        }
    }

    async function goToPage(next: number): Promise<void> {
        const clamped = Math.min(Math.max(1, next), pageCount.value);
        if (clamped === page.value) return;
        page.value = clamped;
        await load();
    }

    /**
     * A write replays the log, so the portfolio the caller is showing is stale
     * the moment this returns — `onWrite` is how it learns to re-read.
     */
    async function mutate(action: () => Promise<unknown>): Promise<void> {
        error.value = null;
        try {
            await action();
        } catch (err) {
            error.value = apiErrorMessage(err, i18n.global.t('errors.INTERNAL'));
            throw err;
        }
        await load();
        await onWrite();
    }

    async function create(trade: TradeInput): Promise<void> {
        // A new trade is almost always the newest, and the blotter is newest
        // first, so it belongs on the page the user is about to be looking at.
        page.value = 1;
        await mutate(() => addTrade(portfolio(), trade));
    }

    async function update(id: string, trade: TradeInput): Promise<void> {
        await mutate(() => updateTrade(portfolio(), id, trade));
    }

    async function remove(id: string): Promise<void> {
        await mutate(async () => {
            await deleteTrade(portfolio(), id);
            // Removing the only row on the last page would otherwise leave the
            // view sitting on a page that no longer exists.
            if (items.value.length === 1 && page.value > 1) page.value -= 1;
        });
    }

    return { items, total, page, pageCount, pending, error, load, goToPage, create, update, remove };
}
