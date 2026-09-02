/**
 * useResource — one async read that reloads when what it depends on changes.
 * Every panel in the app is the same shape: read something for the current
 * symbol, show a spinner, show an error, replace it when the symbol changes.
 * Out-of-order responses are the reason this exists rather than a plain watch.
 * Click AAPL then MSFT quickly and two requests are in flight; if AAPL's answer
 * lands second, a naive handler paints AAPL's numbers under MSFT's title. Each
 * request takes a sequence number here and a late one is dropped, so what is on
 * screen always belongs to the key that is current.
 */
import { getCurrentScope, onScopeDispose, readonly, ref, watch, type DeepReadonly, type Ref } from 'vue';
import { apiErrorMessage } from '@/api/client';
import { i18n } from '@/i18n';

export type UseResourceReturn<TValue> = {
    data: Readonly<Ref<TValue | null>>;
    pending: DeepReadonly<Ref<boolean>>;
    error: DeepReadonly<Ref<string | null>>;
    reload: () => Promise<void>;
    mutate: (value: TValue | null) => void;
};

export type ResourceOptions<TKey> = {
    enabled?: (key: TKey) => boolean;
};

export function useResource<TKey, TValue>(
    key: () => TKey,
    fetcher: (key: TKey) => Promise<TValue>,
    options: ResourceOptions<TKey> = {},
): UseResourceReturn<TValue> {
    const data = ref<TValue | null>(null) as Ref<TValue | null>;
    const pending = ref(false);
    const error = ref<string | null>(null);

    let sequence = 0;
    let disposed = false;

    async function run(): Promise<void> {
        const current = key();
        const enabled = options.enabled?.(current) ?? true;

        if (!enabled) {
            sequence += 1; // Invalidate anything in flight for the previous key.
            data.value = null;
            error.value = null;
            pending.value = false;
            return;
        }

        const ticket = (sequence += 1);
        pending.value = true;
        error.value = null;

        try {
            const value = await fetcher(current);
            if (ticket !== sequence || disposed) return;
            data.value = value;
        } catch (err) {
            if (ticket !== sequence || disposed) return;
            data.value = null;
            error.value = apiErrorMessage(err, i18n.global.t('errors.INTERNAL'));
        } finally {
            if (ticket === sequence && !disposed) pending.value = false;
        }
    }

    watch(key, run, { immediate: true });

    if (getCurrentScope() !== undefined) {
        onScopeDispose(() => {
            // A response that lands after the component is gone must not write
            // to refs nobody is rendering any more.
            disposed = true;
        });
    }

    function mutate(value: TValue | null): void {
        // A local edit is the current answer: invalidate anything in flight so a
        // response that predates it cannot overwrite what the user just did.
        sequence += 1;
        pending.value = false;
        data.value = value;
    }

    return { data, pending: readonly(pending), error: readonly(error), reload: run, mutate };
}
