import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import FlagFilter from '@/components/screener/FlagFilter.vue';

const filter = (props: Record<string, unknown> = {}): VueWrapper => mount(FlagFilter, { props });

describe('FlagFilter', () => {
    it('is unticked when the filter is not set', () => {
        expect((filter().get('input').element as HTMLInputElement).checked).toBe(false);
    });

    it('is ticked when the filter is on', () => {
        expect((filter({ value: { enabled: true } }).get('input').element as HTMLInputElement).checked).toBe(true);
    });

    it('applies the box it was just given', async () => {
        const wrapper = filter();

        await wrapper.get('input').setValue(true);

        expect(wrapper.emitted('apply')?.[0]).toEqual([{ enabled: true }]);
    });

    it('reports being turned off, which the panel reads as a clear', async () => {
        const wrapper = filter({ value: { enabled: true } });

        await wrapper.get('input').setValue(false);

        expect(wrapper.emitted('apply')?.[0]).toEqual([{ enabled: false }]);
    });

    it('locks while a write is in flight', () => {
        expect(filter({ busy: true }).get('input').attributes('disabled')).toBeDefined();
    });
});
