import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { formatNumber } from '@/utils/formatters';
import RangeFilter from '@/components/screener/RangeFilter.vue';

const filter = (props: Record<string, unknown> = {}): VueWrapper => mount(RangeFilter, { props });

const submit = async (wrapper: VueWrapper, min: string, max: string): Promise<void> => {
    await wrapper.findAll('input')[0]?.setValue(min);
    await wrapper.findAll('input')[1]?.setValue(max);
    await wrapper.get('form').trigger('submit');
};

describe('RangeFilter', () => {
    it('applies both ends when both are given', async () => {
        const wrapper = filter();

        await submit(wrapper, '10', '20');

        expect(wrapper.emitted('apply')?.[0]).toEqual([{ min: 10, max: 20 }]);
    });

    it('treats a blank side as no limit rather than as zero', async () => {
        const wrapper = filter();

        await submit(wrapper, '', '20');

        expect(wrapper.emitted('apply')?.[0]).toEqual([{ min: undefined, max: 20 }]);
    });

    it('refuses a range with nothing in it', async () => {
        const wrapper = filter();

        await submit(wrapper, '', '');

        expect(wrapper.emitted('apply')).toBeUndefined();
        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('screener.errorNumber'));
    });

    it('refuses a minimum that is not below the maximum', async () => {
        const wrapper = filter();

        await submit(wrapper, '20', '20');

        expect(wrapper.emitted('apply')).toBeUndefined();
        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('screener.errorMinMax'));
    });

    it('refuses a range the browser could not read as a number', async () => {
        const wrapper = filter();

        await submit(wrapper, 'abc', '');

        expect(wrapper.emitted('apply')).toBeUndefined();
        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('screener.errorNumber'));
    });

    it('clears the complaint once a good range is applied', async () => {
        const wrapper = filter();

        await submit(wrapper, '', '');
        await submit(wrapper, '1', '2');

        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });

    it('shows the stored range when there is one', () => {
        const inputs = filter({ value: { min: 3, max: 9 } }).findAll('input');

        expect((inputs[0]?.element as HTMLInputElement).value).toBe('3');
        expect((inputs[1]?.element as HTMLInputElement).value).toBe('9');
    });

    it('empties the fields when the filter is cleared', async () => {
        const wrapper = filter({ value: { min: 3, max: 9 } });

        await wrapper.setProps({ value: null });

        expect((wrapper.findAll('input')[0]?.element as HTMLInputElement).value).toBe('');
    });

    it('hints at the dataset range when it knows one', () => {
        const inputs = filter({ bounds: { min: 1.5, max: 900 } }).findAll('input');

        expect(inputs[0]?.attributes('placeholder')).toBe(formatNumber(1.5, 2));
        expect(inputs[1]?.attributes('placeholder')).toBe(formatNumber(900, 2));
    });

    it('falls back to a generic hint with no bounds to name', () => {
        expect(filter().findAll('input')[0]?.attributes('placeholder')).toBe(i18n.global.t('screener.min'));
    });

    it('locks the apply button while a write is in flight', () => {
        expect(filter({ busy: true }).get('button').attributes('disabled')).toBeDefined();
    });
});
