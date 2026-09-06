/** useScreenerResults — one page of matches, for one screener or for all of them. */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { apiErrorMessage } from '@/api/client';
import { getCombinedResults, getScreenerResults, type ScreenerResult } from '@/api/screener';
import { i18n } from '@/i18n';

/** Which set of matches to read: the named screener, or every included one. */
export type ResultsSource = { kind: 'screener'; name: string } | { kind: 'combined' };

export type UseScreenerResultsReturn = {
    items: Ref<ScreenerResult[]>;
    total: Ref<number>;
    page: Ref<number>;
    pages: Ref<number>;
    pending: Ref<boolean>;
    error: Ref<string | null>;
    isEmpty: ComputedRef<boolean>;
    goTo: (page: number) => void;
    reload: () => Promise<void>;
};

const PAGE_SIZE = 100;

export function useScreenerResults(source: () => ResultsSource, revision: () => number): UseScreenerResultsReturn {
    const items = ref<ScreenerResult[]>([]);
    const total = ref(0);
    const page = ref(1);
    const pages = ref(0);
    const pending = ref(false);
    const error = ref<string | null>(null);

    let sequence = 0;

    async function fetchPage(): Promise<void> {
        const current = source();
        if (current.kind === 'screener' && current.name === '') {
            sequence += 1;
            items.value = [];
            total.value = 0;
            pages.value = 0;
            return;
        }

        const ticket = (sequence += 1);
        pending.value = true;
        error.value = null;

        try {
            const query = { page: page.value, limit: PAGE_SIZE };
            const { data } =
                current.kind === 'combined'
                    ? await getCombinedResults(query)
                    : await getScreenerResults(current.name, query);

            if (ticket !== sequence) return;
            items.value = data.items;
            total.value = data.total;
            pages.value = data.pages;
        } catch (err) {
            if (ticket !== sequence) return;
            items.value = [];
            total.value = 0;
            pages.value = 0;
            error.value = apiErrorMessage(err, i18n.global.t('errors.INTERNAL'));
        } finally {
            if (ticket === sequence) pending.value = false;
        }
    }

    // Changing the source or the filters starts again from page one; only a
    // page change keeps the position it just asked for.
    watch(
        // One string rather than a tuple: a tuple is a new array on every
        // evaluation, so anything that merely re-ran this getter — switching the
        // list to the hidden symbols, say — re-queried a match set that had not
        // changed.
        () => `${JSON.stringify(source())}|${String(revision())}`,
        () => {
            page.value = 1;
            void fetchPage();
        },
        { immediate: true },
    );

    watch(page, () => void fetchPage());

    function goTo(next: number): void {
        const clamped = Math.min(Math.max(next, 1), Math.max(pages.value, 1));
        if (clamped !== page.value) page.value = clamped;
    }

    return {
        items,
        total,
        page,
        pages,
        pending,
        error,
        isEmpty: computed(() => !pending.value && items.value.length === 0),
        goTo,
        reload: fetchPage,
    };
}
