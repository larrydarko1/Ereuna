import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import DateFilter from '@/components/screener/DateFilter.vue';

const filter = (props: Record<string, unknown> = {}): VueWrapper => mount(DateFilter, { props });

const submit = async (wrapper: VueWrapper, from: string, to: string): Promise<void> => {
    await wrapper.findAll('input')[0]?.setValue(from);
    await wrapper.findAll('input')[1]?.setValue(to);
    await wrapper.get('form').trigger('submit');
};

describe('DateFilter', () => {
    it('applies both ends when both are given', async () => {
        const wrapper = filter();

        await submit(wrapper, '2026-01-01', '2026-06-30');

        expect(wrapper.emitted('apply')?.[0]).toEqual([{ from: '2026-01-01', to: '2026-06-30' }]);
    });

    it('treats a blank side as no bound rather than as an epoch', async () => {
        const wrapper = filter();

        await submit(wrapper, '2026-01-01', '');

        expect(wrapper.emitted('apply')?.[0]).toEqual([{ from: '2026-01-01', to: undefined }]);
    });

    it('refuses a span with nothing in it', async () => {
        const wrapper = filter();

        await submit(wrapper, '', '');

        expect(wrapper.emitted('apply')).toBeUndefined();
        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('screener.errorDate'));
    });

    it('refuses a start that is not before its end', async () => {
        const wrapper = filter();

        await submit(wrapper, '2026-06-30', '2026-01-01');

        expect(wrapper.emitted('apply')).toBeUndefined();
        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('screener.errorMinMax'));
    });

    it('shows the stored span as date inputs, not as timestamps', () => {
        const inputs = filter({ value: { from: '2026-01-01T00:00:00.000Z', to: '2026-06-30T00:00:00.000Z' } }).findAll(
            'input',
        );

        expect((inputs[0]?.element as HTMLInputElement).value).toBe('2026-01-01');
        expect((inputs[1]?.element as HTMLInputElement).value).toBe('2026-06-30');
    });

    it('empties the fields when the filter is cleared', async () => {
        const wrapper = filter({ value: { from: '2026-01-01', to: '2026-06-30' } });

        await wrapper.setProps({ value: null });

        expect((wrapper.findAll('input')[0]?.element as HTMLInputElement).value).toBe('');
    });

    it('holds the picker to the dataset range, dropping the time part', () => {
        const inputs = filter({
            bounds: { min: '2020-01-01T00:00:00.000Z', max: '2026-12-31T00:00:00.000Z' },
        }).findAll('input');

        expect(inputs[0]?.attributes('min')).toBe('2020-01-01');
        expect(inputs[0]?.attributes('max')).toBe('2026-12-31');
    });

    it('locks the apply button while a write is in flight', () => {
        expect(filter({ busy: true }).get('button').attributes('disabled')).toBeDefined();
    });
});
