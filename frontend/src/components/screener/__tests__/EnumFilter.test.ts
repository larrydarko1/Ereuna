import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import EnumFilter from '@/components/screener/EnumFilter.vue';

const SHORT = ['Energy', 'Health', 'Tech'];
const LONG = Array.from({ length: 12 }, (_, index) => `Sector ${index}`);

const filter = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(EnumFilter, { props: { options: SHORT, ...props } });

describe('EnumFilter', () => {
    it('lists every option it was given', () => {
        expect(filter().findAll('.enum-filter__item')).toHaveLength(3);
    });

    it('ticks the stored selection', () => {
        const wrapper = filter({ value: { values: ['Tech'] } });
        const boxes = wrapper.findAll('input[type="checkbox"]');

        expect((boxes[0]?.element as HTMLInputElement).checked).toBe(true);
        expect((boxes[1]?.element as HTMLInputElement).checked).toBe(false);
    });

    // The list scrolls inside a fixed box, so an applied value far down the
    // alphabet was invisible until someone thought to scroll for it.
    it('floats the applied values above the ones that were not chosen', () => {
        const wrapper = filter({ options: LONG, value: { values: ['Sector 9'] } });

        expect(wrapper.findAll('.enum-filter__item')[0]?.text()).toBe('Sector 9');
    });

    it('applies what is ticked', async () => {
        const wrapper = filter();

        await wrapper.findAll('input[type="checkbox"]')[1]?.setValue(true);
        await wrapper.get('.enum-filter__apply').trigger('click');

        expect(wrapper.emitted('apply')?.[0]).toEqual([{ values: ['Health'] }]);
    });

    it('refuses to apply a selection identical to the stored one', () => {
        const wrapper = filter({ value: { values: ['Tech'] } });

        expect(wrapper.get('.enum-filter__apply').attributes('disabled')).toBeDefined();
    });

    it('offers to apply once the selection differs', async () => {
        const wrapper = filter({ value: { values: ['Tech'] } });

        // Index 1, not 0: the applied value leads the list.
        await wrapper.findAll('input[type="checkbox"]')[1]?.setValue(true);

        expect(wrapper.get('.enum-filter__apply').attributes('disabled')).toBeUndefined();
    });

    it('offers no search box for a list short enough to read', () => {
        expect(filter().find('input[type="search"]').exists()).toBe(false);
    });

    it('offers a search box once the list is long', () => {
        expect(filter({ options: LONG }).find('input[type="search"]').exists()).toBe(true);
    });

    it('narrows the list to what was typed, ignoring case', async () => {
        const wrapper = filter({ options: LONG });

        await wrapper.get('input[type="search"]').setValue('sector 1');

        expect(wrapper.findAll('.enum-filter__item')).toHaveLength(3);
    });

    it('says so when nothing matches', async () => {
        const wrapper = filter({ options: LONG });

        await wrapper.get('input[type="search"]').setValue('nothing');

        expect(wrapper.get('.enum-filter__empty').text()).toBe(i18n.global.t('screener.noOptions'));
    });

    it('drops the selection when the filter is cleared', async () => {
        const wrapper = filter({ value: { values: ['Tech'] } });

        await wrapper.setProps({ value: null });

        expect((wrapper.findAll('input[type="checkbox"]')[2]?.element as HTMLInputElement).checked).toBe(false);
    });

    it('locks the apply button while a write is in flight', () => {
        expect(
            filter({ busy: true, value: { values: ['Tech'] } })
                .get('.enum-filter__apply')
                .attributes('disabled'),
        ).toBeDefined();
    });
});
