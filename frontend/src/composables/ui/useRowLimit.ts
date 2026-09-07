/**
 * useRowLimit — show the first few rows of a list, with a control to see the
 * rest and to go back. The sidebar's tables each hold a full history the API already sent, so this
 * is a render limit and not a page: expanding fetches nothing.
 */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';

export type UseRowLimitReturn<T> = {
    rows: ComputedRef<readonly T[]>; // The slice to render
    expanded: Ref<boolean>;
    toggleable: ComputedRef<boolean>; // False when the whole list already fits, so no control is offered
    hidden: ComputedRef<number>; // How many rows the short list leaves out
    toggle: () => void;
};

export function useRowLimit<T>(source: () => readonly T[], limit: number): UseRowLimitReturn<T> {
    const expanded = ref(false);

    const all = computed(() => source());
    const rows = computed<readonly T[]>(() => (expanded.value ? all.value : all.value.slice(0, limit)));
    const toggleable = computed(() => all.value.length > limit);
    const hidden = computed(() => Math.max(0, all.value.length - limit));

    function toggle(): void {
        expanded.value = !expanded.value;
    }

    watch(all, () => {
        expanded.value = false;
    });

    return { rows, expanded, toggleable, hidden, toggle };
}
