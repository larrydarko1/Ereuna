/** usePortfolios — the ten slots, which one is open, and its settled state. */
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { apiErrorCode, apiErrorMessage } from '@/api/client';
import {
    deletePortfolio,
    exportPortfolio,
    getPortfolio,
    importPortfolio,
    getPortfolios,
    setBaseValue,
    setBenchmarks,
    setDefaultCommission,
    setLeverage,
    type PortfolioExport,
    type PortfolioImport,
    type PortfolioRow,
    type PortfolioSummary,
} from '@/api/portfolio';
import { i18n } from '@/i18n';

export type UsePortfoliosReturn = {
    slots: Ref<PortfolioRow[]>;
    selected: Ref<number>;
    summary: Ref<PortfolioSummary | null>;
    revision: Ref<number>;
    pending: Ref<boolean>;
    error: Ref<string | null>;
    openedSlots: ComputedRef<Set<number>>;
    isBlank: ComputedRef<boolean>;
    heldSymbols: ComputedRef<string[]>;
    load: () => Promise<void>;
    select: (slot: number) => Promise<void>;
    reload: () => Promise<void>;
    saveBaseValue: (value: number) => Promise<void>;
    saveLeverage: (value: number) => Promise<void>;
    saveCommission: (value: number) => Promise<void>;
    saveBenchmarks: (symbols: readonly string[]) => Promise<void>;
    reset: () => Promise<void>;
    exportCurrent: () => Promise<PortfolioExport>;
    importInto: (payload: PortfolioImport) => Promise<number>;
};

/** Slots are 0-based and the count is fixed by the API. */
export const PORTFOLIO_SLOTS = 10;

export function usePortfolios(): UsePortfoliosReturn {
    const slots = ref<PortfolioRow[]>([]);
    const selected = ref(0);
    const summary = ref<PortfolioSummary | null>(null);
    const revision = ref(0);
    const pending = ref(false);
    const error = ref<string | null>(null);

    let sequence = 0;

    const openedSlots = computed(() => new Set(slots.value.map((row) => row.number)));

    /** An untouched slot: nothing held, nothing owed, no capital declared. */
    const isBlank = computed(() => {
        const current = summary.value;
        if (current === null) return true;
        return current.positions.length === 0 && current.cash === 0 && current.baseValue === 0;
    });

    const heldSymbols = computed(() => (summary.value?.positions ?? []).map((position) => position.symbol));

    function fail(err: unknown): string {
        return apiErrorMessage(err, i18n.global.t('errors.INTERNAL'));
    }

    async function load(): Promise<void> {
        try {
            const { data } = await getPortfolios();
            slots.value = data.items;
        } catch (err) {
            error.value = fail(err);
        }
    }

    /**
     * Read the open slot. Out-of-order responses matter here because the ten
     * tabs are one click apart: without the ticket, slot 3's answer landing
     * after slot 7's would paint the wrong portfolio under the right tab.
     */
    async function reload(): Promise<void> {
        const ticket = (sequence += 1);
        const slot = selected.value;
        pending.value = true;
        error.value = null;

        try {
            const { data } = await getPortfolio(slot);
            if (ticket !== sequence) return;
            summary.value = data;
        } catch (err) {
            if (ticket !== sequence) return;
            summary.value = null;
            // A slot nobody has written to yet is empty, not broken.
            if (apiErrorCode(err) !== 'PORTFOLIO_NOT_FOUND') error.value = fail(err);
        } finally {
            if (ticket === sequence) pending.value = false;
        }
    }

    async function select(slot: number): Promise<void> {
        if (slot === selected.value) return;
        selected.value = slot;
        summary.value = null;
        await reload();
    }

    /**
     * Run a write, then re-read. The server replays the whole log on every
     * write, so the value a route returns is never the whole story — leverage
     * alone can change cash, buying power and every statistic built on them.
     */
    async function mutate(action: () => Promise<unknown>): Promise<void> {
        error.value = null;
        try {
            await action();
        } catch (err) {
            error.value = fail(err);
            throw err;
        }
        revision.value += 1;
        await Promise.all([reload(), load()]);
    }

    async function saveBaseValue(value: number): Promise<void> {
        await mutate(() => setBaseValue(selected.value, value));
    }

    async function saveLeverage(value: number): Promise<void> {
        await mutate(() => setLeverage(selected.value, value));
    }

    async function saveCommission(value: number): Promise<void> {
        await mutate(() => setDefaultCommission(selected.value, value));
    }

    async function saveBenchmarks(symbols: readonly string[]): Promise<void> {
        await mutate(() => setBenchmarks(selected.value, symbols));
    }

    /** Delete the slot outright. It reopens blank on the next write. */
    async function reset(): Promise<void> {
        await mutate(() => deletePortfolio(selected.value));
    }

    async function exportCurrent(): Promise<PortfolioExport> {
        const { data } = await exportPortfolio(selected.value);
        return data;
    }

    async function importInto(payload: PortfolioImport): Promise<number> {
        let imported = 0;
        await mutate(async () => {
            const { data } = await importPortfolio(selected.value, payload);
            imported = data.imported;
        });
        return imported;
    }

    return {
        slots,
        selected,
        summary,
        revision,
        pending,
        error,
        openedSlots,
        isBlank,
        heldSymbols,
        load,
        select,
        reload,
        saveBaseValue,
        saveLeverage,
        saveCommission,
        saveBenchmarks,
        reset,
        exportCurrent,
        importInto,
    };
}
