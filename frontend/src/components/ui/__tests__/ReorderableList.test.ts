import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import ReorderableList from '@/components/ui/ReorderableList.vue';

const ITEMS = [
    { key: 'summary', label: 'Summary' },
    { key: 'news', label: 'News' },
    { key: 'notes', label: 'Notes' },
];

const list = (selected: string[]): VueWrapper =>
    mount(ReorderableList, { props: { items: ITEMS, modelValue: selected } });

const chosenLabels = (wrapper: VueWrapper): string[] =>
    wrapper.findAll('ol .reorderable__label').map((node) => node.text());

const byLabel = (wrapper: VueWrapper, key: string, label: string): ReturnType<VueWrapper['get']> =>
    wrapper.get(`[aria-label="${i18n.global.t(key, { name: label })}"]`);

describe('ReorderableList', () => {
    it('shows the chosen items in the order they are stored', () => {
        const wrapper = list(['news', 'summary']);

        expect(chosenLabels(wrapper)).toEqual(['News', 'Summary']);
    });

    it('shows everything not chosen as hidden', () => {
        const wrapper = list(['summary']);

        expect(wrapper.findAll('ul .reorderable__label').map((node) => node.text())).toEqual(['News', 'Notes']);
    });

    it('renders no hidden section when everything is shown', () => {
        const wrapper = list(['summary', 'news', 'notes']);

        expect(wrapper.find('ul').exists()).toBe(false);
    });

    it('falls back to the key for an item the catalogue no longer names', () => {
        const wrapper = list(['retired']);

        expect(chosenLabels(wrapper)).toEqual(['retired']);
    });

    it('moves an item up', async () => {
        const wrapper = list(['summary', 'news', 'notes']);

        await byLabel(wrapper, 'panels.moveUp', 'News').trigger('click');

        expect(wrapper.emitted('update:modelValue')).toEqual([[['news', 'summary', 'notes']]]);
    });

    it('moves an item down', async () => {
        const wrapper = list(['summary', 'news', 'notes']);

        await byLabel(wrapper, 'panels.moveDown', 'Summary').trigger('click');

        expect(wrapper.emitted('update:modelValue')).toEqual([[['news', 'summary', 'notes']]]);
    });

    it('cannot move the first item up or the last one down', () => {
        const wrapper = list(['summary', 'news']);

        expect(byLabel(wrapper, 'panels.moveUp', 'Summary').attributes('disabled')).toBeDefined();
        expect(byLabel(wrapper, 'panels.moveDown', 'News').attributes('disabled')).toBeDefined();
    });

    it('hides an item', async () => {
        const wrapper = list(['summary', 'news']);

        await byLabel(wrapper, 'panels.hide', 'Summary').trigger('click');

        expect(wrapper.emitted('update:modelValue')).toEqual([[['news']]]);
    });

    it('shows a hidden item, at the end', async () => {
        const wrapper = list(['summary']);

        await byLabel(wrapper, 'panels.show', 'Notes').trigger('click');

        expect(wrapper.emitted('update:modelValue')).toEqual([[['summary', 'notes']]]);
    });
});
