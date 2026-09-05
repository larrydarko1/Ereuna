/**
 * useChartSymbol — which instrument the chart view is showing.
 * The symbol lives in the URL (`/charts/AAPL`), so a chart can be linked to and
 * the back button walks the symbols the user looked at. The account's
 * `defaultSymbol` is the fallback for a bare `/charts`, and is updated as the
 * user browses so the next visit opens where they left off.
 */
import { computed, type ComputedRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { patchPreferences, usePreferences } from '@/composables/data/usePreferences';

export type UseChartSymbolReturn = {
    symbol: ComputedRef<string>;
    select: (next: string) => Promise<void>;
    canonicalize: () => Promise<void>; // Put the resolved symbol in the URL without adding a history entry.
};

export function useChartSymbol(): UseChartSymbolReturn {
    const route = useRoute();
    const router = useRouter();
    const { preferences } = usePreferences();

    const routeSymbol = computed(() => {
        const param = route.params.symbol;
        return typeof param === 'string' ? param.trim().toUpperCase() : '';
    });

    const symbol = computed(() =>
        routeSymbol.value === '' ? (preferences.value?.defaultSymbol ?? '') : routeSymbol.value,
    );

    async function select(next: string): Promise<void> {
        const target = next.trim().toUpperCase();
        if (target === '' || target === routeSymbol.value) return;

        await router.push({ name: 'Charts', params: { symbol: target } });
        // Fire and forget: the chart has already moved, and a failed write only
        // means the next fresh visit opens on the previous default.
        patchPreferences({ defaultSymbol: target }).catch(() => undefined);
    }

    async function canonicalize(): Promise<void> {
        if (routeSymbol.value !== '' || symbol.value === '') return;
        await router.replace({ name: 'Charts', params: { symbol: symbol.value } });
    }

    return { symbol, select, canonicalize };
}
