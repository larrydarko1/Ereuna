/** useScreenerResults — one page of matches, for one screener, all of them, or the hidden set. */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { apiErrorMessage, type ApiResult } from '@/api/client';
import {
    getCombinedResults,
    getHiddenResults,
    getScreenerResults,
    type ResultsQuery,
    type ScreenerResult,
    type ScreenerResultPage,
} from '@/api/screener';
import { i18n } from '@/i18n';

/** Which set of matches to read: the named screener, every included one, or the hidden list. */
export type ResultsSource = { kind: 'screener'; name: string } | { kind: 'combined' } | { kind: 'hidden' };

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

/**
 * The endpoint behind one source.
 * Exported because the CSV export walks the same three sources page by page,
 * and a second copy of this switch is a second place to forget a source.
 */
export function fetchResults(source: ResultsSource, query: ResultsQuery): ApiResult<ScreenerResultPage> {
    switch (source.kind) {
        case 'combined':
            return getCombinedResults(query);
        case 'hidden':
            return getHiddenResults(query);
        case 'screener':
            return getScreenerResults(source.name, query);
    }
}

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
            const { data } = await fetchResults(current, { page: page.value, limit: PAGE_SIZE });

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
        // evaluation, so anything that merely re-ran this getter re-queried a
        // match set that had not changed.
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
