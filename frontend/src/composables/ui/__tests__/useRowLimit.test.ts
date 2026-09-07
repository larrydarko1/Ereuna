import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useRowLimit, type UseRowLimitReturn } from '@/composables/ui/useRowLimit';

/** The composable registers a watcher, so it needs a scope to be collected with. */
function inScope<T>(source: () => readonly T[], limit: number): UseRowLimitReturn<T> {
    const scope = effectScope();
    return scope.run(() => useRowLimit(source, limit)) as UseRowLimitReturn<T>;
}

const rows = (count: number): number[] => Array.from({ length: count }, (_, index) => index);

describe('useRowLimit', () => {
    it('renders only the first `limit` rows until it is expanded', () => {
        const { rows: shown } = inScope(() => rows(9), 4);

        expect(shown.value).toEqual([0, 1, 2, 3]);
    });

    it('counts what the short list leaves out', () => {
        expect(inScope(() => rows(9), 4).hidden.value).toBe(5);
        expect(inScope(() => rows(2), 4).hidden.value).toBe(0);
    });

    it('offers no control when the whole list already fits', () => {
        expect(inScope(() => rows(4), 4).toggleable.value).toBe(false);
        expect(inScope(() => rows(0), 4).toggleable.value).toBe(false);
        expect(inScope(() => rows(5), 4).toggleable.value).toBe(true);
    });

    it('goes both ways — expanding is not one-way', () => {
        const limit = inScope(() => rows(9), 4);

        limit.toggle();
        expect(limit.rows.value).toHaveLength(9);

        limit.toggle();
        expect(limit.rows.value).toHaveLength(4);
    });

    it('collapses when the list is replaced, so one symbol does not expand the next', async () => {
        const source = ref(rows(9));
        const limit = inScope(() => source.value, 4);
        limit.toggle();
        expect(limit.rows.value).toHaveLength(9);
        source.value = rows(9);
        await nextTick();

        expect(limit.expanded.value).toBe(false);
        expect(limit.rows.value).toHaveLength(4);
    });

    it('leaves the view alone while the same list is merely re-read', async () => {
        const source = ref(rows(9));
        const limit = inScope(() => source.value, 4);
        limit.toggle();

        await nextTick();

        expect(limit.rows.value).toHaveLength(9);
    });
});
