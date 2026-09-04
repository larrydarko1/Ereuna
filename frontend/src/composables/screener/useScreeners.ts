/**
 * useScreeners — the user's saved screeners and which one is being edited.
 * A screener is addressed by name everywhere in the API, so a rename has to
 * move the selection with it;
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { apiErrorMessage } from '@/api/client';
import { createScreener, deleteScreener, listScreeners, updateScreener, type ScreenerSummary } from '@/api/screener';
import { i18n } from '@/i18n';

export type UseScreenersReturn = {
    items: Ref<ScreenerSummary[]>;
    selected: Ref<string>;
    current: ComputedRef<ScreenerSummary | null>;
    includedCount: ComputedRef<number>;
    pending: Ref<boolean>;
    error: Ref<string | null>;
    load: () => Promise<void>;
    create: (name: string) => Promise<void>;
    rename: (name: string) => Promise<void>;
    remove: (name: string) => Promise<void>;
    setIncluded: (name: string, include: boolean) => Promise<void>;
};

export function useScreeners(): UseScreenersReturn {
    const items = ref<ScreenerSummary[]>([]);
    const selected = ref('');
    const pending = ref(false);
    const error = ref<string | null>(null);

    const current = computed(() => items.value.find((item) => item.name === selected.value) ?? null);
    const includedCount = computed(() => items.value.filter((item) => item.include).length);

    async function load(): Promise<void> {
        pending.value = true;
        error.value = null;
        try {
            const { data } = await listScreeners();
            items.value = data.items;

            // Hold the selection if it survived, otherwise fall to the first
            // screener — an empty panel with a name in the header is a dead end.
            if (!data.items.some((item) => item.name === selected.value)) {
                selected.value = data.items[0]?.name ?? '';
            }
        } catch (err) {
            error.value = apiErrorMessage(err, i18n.global.t('errors.INTERNAL'));
        } finally {
            pending.value = false;
        }
    }

    /** Wrap a mutation so a rejected one surfaces its message and leaves the list intact. */
    async function mutate(action: () => Promise<string | null>): Promise<void> {
        error.value = null;
        try {
            const next = await action();
            if (next !== null) selected.value = next;
            await load();
        } catch (err) {
            error.value = apiErrorMessage(err, i18n.global.t('errors.INTERNAL'));
            throw err;
        }
    }

    async function create(name: string): Promise<void> {
        await mutate(async () => {
            const { data } = await createScreener(name);
            return data.name;
        });
    }

    async function rename(name: string): Promise<void> {
        const from = selected.value;
        await mutate(async () => {
            const { data } = await updateScreener(from, { name });
            return data.name;
        });
    }

    async function remove(name: string): Promise<void> {
        await mutate(async () => {
            await deleteScreener(name);
            // Clearing the selection lets `load` choose the next survivor
            // rather than leaving a name that no longer resolves.
            return name === selected.value ? '' : null;
        });
    }

    async function setIncluded(name: string, include: boolean): Promise<void> {
        await mutate(async () => {
            await updateScreener(name, { include });
            return null;
        });
    }

    return { items, selected, current, includedCount, pending, error, load, create, rename, remove, setIncluded };
}
