import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import MaFilter from '@/components/screener/MaFilter.vue';

const DIRECTIONS = ['abv', 'blw'];
const TARGETS = ['price', '50', '200'];

const filter = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(MaFilter, { props: { directions: DIRECTIONS, targets: TARGETS, ...props } });

describe('MaFilter', () => {
    it('offers every direction and target it was given', () => {
        const selects = filter().findAll('select');

        expect(selects[0]?.findAll('option')).toHaveLength(2);
        expect(selects[1]?.findAll('option')).toHaveLength(3);
    });

    it('starts on the first of each when nothing is stored', () => {
        const selects = filter().findAll('select');

        expect((selects[0]?.element as HTMLSelectElement).value).toBe('abv');
        expect((selects[1]?.element as HTMLSelectElement).value).toBe('price');
    });

    it('starts on the stored pair when there is one', () => {
        const selects = filter({ value: { direction: 'blw', target: '200' } }).findAll('select');

        expect((selects[0]?.element as HTMLSelectElement).value).toBe('blw');
        expect((selects[1]?.element as HTMLSelectElement).value).toBe('200');
    });

    it('returns to the defaults when the filter is cleared', async () => {
        const wrapper = filter({ value: { direction: 'blw', target: '200' } });

        await wrapper.setProps({ value: null });

        expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('abv');
    });

    it('applies the pair on screen', async () => {
        const wrapper = filter();

        await wrapper.findAll('select')[0]?.setValue('blw');
        await wrapper.findAll('select')[1]?.setValue('50');
        await wrapper.get('button').trigger('click');

        expect(wrapper.emitted('apply')?.[0]).toEqual([{ direction: 'blw', target: '50' }]);
    });

    it('names the price target in words and the rest in days', () => {
        const options = filter().findAll('select')[1]?.findAll('option') ?? [];

        expect(options[0]?.text()).toBe(i18n.global.t('screener.maPrice'));
        expect(options[1]?.text()).toBe(i18n.global.t('screener.maDays', { days: '50' }));
    });

    it('locks the apply button while a write is in flight', () => {
        expect(filter({ busy: true }).get('button').attributes('disabled')).toBeDefined();
    });
});
