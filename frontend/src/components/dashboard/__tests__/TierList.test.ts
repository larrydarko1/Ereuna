import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { TierRow } from '@ereuna/shared';
import TierList from '@/components/dashboard/TierList.vue';

const tier = (name: string, averageReturn: number): TierRow => ({ name, averageReturn, count: 3 });

const list = (rows: TierRow[], props: Record<string, unknown> = {}): VueWrapper =>
    mount(TierList, { props: { rows, ...props } });

const names = (wrapper: VueWrapper, column: number): string[] =>
    wrapper
        .findAll('.tier__column')
        [column]?.findAll('.tier__name')
        .map((node) => node.text()) ?? [];

describe('TierList', () => {
    it('ranks the strongest first and the weakest first from the other end', () => {
        const wrapper = list([tier('a', 0.01), tier('b', 0.05), tier('c', -0.02), tier('d', 0.03)], { count: 2 });

        expect(names(wrapper, 0)).toEqual(['b', 'd']);
        expect(names(wrapper, 1)).toEqual(['c', 'a']);
    });

    it('never shows the same row in both columns', () => {
        const wrapper = list([tier('a', 0.01), tier('b', 0.05), tier('c', -0.02)], { count: 5 });

        expect(names(wrapper, 0)).toEqual(['b']);
        expect(names(wrapper, 1)).toEqual(['c']);
    });

    it('shows nothing at all when there is only one row to cut in half', () => {
        const wrapper = list([tier('a', 0.01)]);

        expect(names(wrapper, 0)).toEqual([]);
        expect(names(wrapper, 1)).toEqual([]);
    });

    it('shows five from each end by default', () => {
        const rows = Array.from({ length: 20 }, (_, index) => tier(`row-${index}`, index));

        expect(names(list(rows), 0)).toHaveLength(5);
    });

    it('leaves the caller list untouched', () => {
        const rows = [tier('a', 0.01), tier('b', 0.05)];

        list(rows);

        expect(rows[0]?.name).toBe('a');
    });

    it('shows how many assets each tier was measured over', () => {
        expect(
            list([tier('a', 0.01), tier('b', 0.05)])
                .get('.tier__count')
                .text(),
        ).toBe('3');
    });
});
