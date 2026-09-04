/**
 * useWatchlists — the user's watchlists and the rows of whichever one is open.
 * Held at module scope because two things render it at once: the ticker strip
 * across the top of the chart view and the list panel down its right side. Two
 * copies of this state is two copies that disagree the moment a ticker is added
 * from one of them.
 * Lists are addressed by name, which is what the API keys them on and what the
 * user typed. Rows carry a quote that may be null — a symbol the ingestor has
 * not reached yet still belongs to the list the user built, so it is shown
 * without a price rather than dropped.
 * Writes return the new ticker list, so nothing here re-reads the whole list
 * after a mutation; only the quotes need a second call, and only when the
 * membership actually changed.
 */
import { computed, readonly, ref, type ComputedRef, type DeepReadonly, type Ref } from 'vue';
import { onSessionCleared } from '@/api/client';
import {
    addTicker as addTickerRequest,
    createWatchlist,
    deleteWatchlist,
    getWatchlist,
    listWatchlists,
    removeTicker as removeTickerRequest,
    renameWatchlist,
    reorderTickers as reorderTickersRequest,
    reorderWatchlists,
    type WatchlistRow,
    type WatchlistSummary,
} from '@/api/watchlist';

export type UseWatchlistsReturn = {
    lists: DeepReadonly<Ref<WatchlistSummary[]>>;
    activeName: DeepReadonly<Ref<string | null>>;
    rows: DeepReadonly<Ref<WatchlistRow[]>>;
    pending: DeepReadonly<Ref<boolean>>;
    loaded: DeepReadonly<Ref<boolean>>;
    isEmpty: ComputedRef<boolean>;
    load: (force?: boolean) => Promise<void>;
    open: (name: string) => Promise<void>;
    refresh: () => Promise<void>;
    create: (name: string) => Promise<void>;
    rename: (name: string, newName: string) => Promise<void>;
    remove: (name: string) => Promise<void>;
    reorderLists: (names: readonly string[]) => Promise<void>;
    addTicker: (symbol: string) => Promise<void>;
    addTickers: (symbols: readonly string[]) => Promise<ImportResult>;
    removeTicker: (symbol: string) => Promise<void>;
    reorderTickers: (tickers: readonly string[]) => Promise<void>;
};

/** What an import did: how many symbols went in, and which the API refused. */
type ImportResult = {
    added: number;
    rejected: string[];
};

/** Which list was open last, per browser. Not account state: it is a convenience. */
const ACTIVE_KEY = 'ereuna-watchlist';

const lists = ref<WatchlistSummary[]>([]);
const activeName = ref<string | null>(null);
const rows = ref<WatchlistRow[]>([]);
const pending = ref(false);
const loaded = ref(false);

export function useWatchlists(): UseWatchlistsReturn {
    const isEmpty = computed(() => loaded.value && lists.value.length === 0);

    /** Read the lists, then open one — the remembered one if it still exists. */
    async function load(force = false): Promise<void> {
        if (loaded.value && !force) return;
        pending.value = true;
        try {
            const { data } = await listWatchlists();
            lists.value = data.items;
            loaded.value = true;

            const remembered = readRemembered();
            const target = data.items.find((list) => list.name === remembered) ?? data.items[0];
            await openList(target?.name ?? null);
        } finally {
            pending.value = false;
        }
    }

    async function open(name: string): Promise<void> {
        if (name === activeName.value) return;
        await openList(name);
    }

    /** Re-read the open list's rows — after a write, or to refresh its quotes. */
    async function refresh(): Promise<void> {
        if (activeName.value === null) return;
        const { data } = await getWatchlist(activeName.value);
        rows.value = data.rows;
    }

    async function create(name: string): Promise<void> {
        const { data } = await createWatchlist(name);
        lists.value = [...lists.value, data];
        await openList(data.name);
    }

    async function rename(name: string, newName: string): Promise<void> {
        const { data } = await renameWatchlist(name, newName);
        lists.value = lists.value.map((list) => (list.name === name ? data : list));
        if (activeName.value === name) {
            activeName.value = data.name;
            rememberActive(data.name);
        }
    }

    async function remove(name: string): Promise<void> {
        await deleteWatchlist(name);
        lists.value = lists.value.filter((list) => list.name !== name);
        // Deleting the open list has to leave something open, or the panel is
        // blank with lists still in the picker.
        if (activeName.value === name) await openList(lists.value[0]?.name ?? null);
    }

    async function reorderLists(names: readonly string[]): Promise<void> {
        const { data } = await reorderWatchlists(names);
        lists.value = data.items;
    }

    async function addTicker(symbol: string): Promise<void> {
        if (activeName.value === null) return;
        await addTickerRequest(activeName.value, symbol);
        await afterMembershipChange();
    }

    async function removeTicker(symbol: string): Promise<void> {
        if (activeName.value === null) return;
        const previous = rows.value;
        // Removing is the one write worth doing optimistically: the row is under
        // the pointer, and waiting a round trip to see it go reads as a dead click.
        rows.value = rows.value.filter((row) => row.ticker !== symbol);
        try {
            await removeTickerRequest(activeName.value, symbol);
            syncCount();
        } catch (error) {
            rows.value = previous;
            throw error;
        }
    }

    /**
     * Add several symbols, keeping the ones the API accepts.
     * One request per symbol because there is no bulk route, and sequentially
     * because the ticker limit is checked per write — firing a hundred at once
     * would let the list overshoot it. A symbol the ingestor does not carry, or
     * one already in the list, is reported rather than aborting the rest.
     */
    async function addTickers(symbols: readonly string[]): Promise<ImportResult> {
        const name = activeName.value;
        if (name === null) return { added: 0, rejected: [...symbols] };

        const rejected: string[] = [];
        let added = 0;
        for (const symbol of symbols) {
            try {
                await addTickerRequest(name, symbol);
                added += 1;
            } catch {
                rejected.push(symbol);
            }
        }

        if (added > 0) await afterMembershipChange();
        return { added, rejected };
    }

    async function reorderTickers(tickers: readonly string[]): Promise<void> {
        if (activeName.value === null) return;
        const previous = rows.value;
        const byTicker = new Map(previous.map((row) => [row.ticker, row]));
        rows.value = tickers.flatMap((ticker) => byTicker.get(ticker) ?? []);
        try {
            await reorderTickersRequest(activeName.value, tickers);
        } catch (error) {
            rows.value = previous;
            throw error;
        }
    }

    return {
        lists: readonly(lists),
        activeName: readonly(activeName),
        rows: readonly(rows),
        pending: readonly(pending),
        loaded: readonly(loaded),
        isEmpty,
        load,
        open,
        refresh,
        create,
        rename,
        remove,
        reorderLists,
        addTicker,
        addTickers,
        removeTicker,
        reorderTickers,
    };
}

async function openList(name: string | null): Promise<void> {
    activeName.value = name;
    rememberActive(name);

    if (name === null) {
        rows.value = [];
        return;
    }

    pending.value = true;
    try {
        const { data } = await getWatchlist(name);
        // A slower read for a list the user has since navigated away from must
        // not paint its rows under the current list's name.
        if (activeName.value === name) rows.value = data.rows;
    } finally {
        pending.value = false;
    }
}

/** A new ticker needs its quote, which only the list read has. */
async function afterMembershipChange(): Promise<void> {
    const name = activeName.value;
    if (name === null) return;
    const { data } = await getWatchlist(name);
    if (activeName.value === name) rows.value = data.rows;
    syncCount();
}

/** Keep the picker's per-list count honest without re-reading every list. */
function syncCount(): void {
    lists.value = lists.value.map((list) =>
        list.name === activeName.value ? { ...list, tickerCount: rows.value.length } : list,
    );
}

function readRemembered(): string | null {
    try {
        return localStorage.getItem(ACTIVE_KEY);
    } catch {
        return null; // Private mode, or site data blocked. Falling back to the first list is fine.
    }
}

function rememberActive(name: string | null): void {
    try {
        if (name === null) localStorage.removeItem(ACTIVE_KEY);
        else localStorage.setItem(ACTIVE_KEY, name);
    } catch {
        // Nothing to do: the panel still works, it just opens on the first list next time.
    }
}

onSessionCleared(() => {
    lists.value = [];
    rows.value = [];
    activeName.value = null;
    loaded.value = false;
});
