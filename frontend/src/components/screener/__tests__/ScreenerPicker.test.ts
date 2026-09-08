import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { ScreenerSummary } from '@/api/screener';
import { i18n } from '@/i18n';
import ScreenerPicker from '@/components/screener/ScreenerPicker.vue';

const summary = (name: string, over: Partial<ScreenerSummary> = {}): ScreenerSummary => ({
    id: `id-${name}`,
    name,
    include: true,
    filterCount: 2,
    updatedAt: '2026-03-04T00:00:00.000Z',
    ...over,
});

const picker = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(ScreenerPicker, { props: { items: [summary('Growth')], modelValue: 'Growth', ...props } });

const button = (wrapper: VueWrapper, index: number): ReturnType<VueWrapper['findAll']>[number] => {
    const node = wrapper.findAll('.picker__button')[index];
    if (node === undefined) throw new Error(`no button at ${index}`);
    return node;
};

describe('ScreenerPicker', () => {
    it('lists every screener with its filter count', () => {
        const options = picker({ items: [summary('Growth'), summary('Value', { filterCount: 5 })] }).findAll('option');

        expect(options).toHaveLength(2);
        expect(options[1]?.text()).toBe('Value (5)');
    });

    it('says so when there are no screeners yet', () => {
        const wrapper = picker({ items: [], modelValue: '' });

        expect(wrapper.get('option').text()).toBe(i18n.global.t('screener.noScreeners'));
    });

    it('reports the screener that was picked', async () => {
        const wrapper = picker({ items: [summary('Growth'), summary('Value')] });

        await wrapper.get('select').setValue('Value');

        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Value']);
    });

    it('asks to create, rename, reset and delete', async () => {
        const wrapper = picker();

        await button(wrapper, 0).trigger('click');
        await button(wrapper, 1).trigger('click');
        await button(wrapper, 2).trigger('click');
        await button(wrapper, 3).trigger('click');

        expect(wrapper.emitted('create')).toHaveLength(1);
        expect(wrapper.emitted('rename')).toHaveLength(1);
        expect(wrapper.emitted('reset')).toHaveLength(1);
        expect(wrapper.emitted('remove')).toHaveLength(1);
    });

    it('offers only creation while nothing is selected', () => {
        const wrapper = picker({ items: [], modelValue: '' });

        expect(button(wrapper, 0).attributes('disabled')).toBeUndefined();
        expect(button(wrapper, 1).attributes('disabled')).toBeDefined();
        expect(button(wrapper, 3).attributes('disabled')).toBeDefined();
    });

    it('locks every action while a write is in flight', () => {
        const wrapper = picker({ busy: true });

        expect(wrapper.findAll('.picker__button[disabled]')).toHaveLength(4);
    });

    it('shows the inclusion box only for a selected screener', () => {
        expect(picker({ items: [], modelValue: '' }).find('.picker__include').exists()).toBe(false);
        expect(picker().find('.picker__include').exists()).toBe(true);
    });

    it('reflects whether the screener contributes to the results', () => {
        const wrapper = picker({ items: [summary('Growth', { include: false })] });

        expect((wrapper.get('.picker__include input').element as HTMLInputElement).checked).toBe(false);
    });

    it('reports the inclusion box being turned off', async () => {
        const wrapper = picker();

        await wrapper.get('.picker__include input').setValue(false);

        expect(wrapper.emitted('toggleInclude')?.[0]).toEqual([false]);
    });

    it('says how many screeners are combined into the results', () => {
        expect(picker({ includedCount: 3 }).get('.picker__hint').text()).toBe(
            i18n.global.t('screener.includeHint', { count: 3 }),
        );
    });
});
