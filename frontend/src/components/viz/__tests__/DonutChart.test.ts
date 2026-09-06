import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import DonutChart from '@/components/viz/DonutChart.vue';

const chart = (slices: { label: string; value: number }[], label = 'Allocation'): VueWrapper =>
    mount(DonutChart, { props: { slices, label } });

/** The track is a circle too; the slices are the ones after it. */
const arcs = (wrapper: VueWrapper): ReturnType<VueWrapper['findAll']> => wrapper.findAll('.donut-chart__slice');

describe('DonutChart', () => {
    it('is an image named by the caller', () => {
        const wrapper = chart([{ label: 'Tech', value: 1 }]);

        expect(wrapper.get('svg').attributes('aria-label')).toBe('Allocation');
    });

    it('draws one arc and one legend row per slice', () => {
        const wrapper = chart([
            { label: 'Tech', value: 50 },
            { label: 'Energy', value: 50 },
        ]);

        expect(arcs(wrapper)).toHaveLength(2);
        expect(wrapper.findAll('.donut-chart__legend-item')).toHaveLength(2);
    });

    it('sizes each arc by its share of the whole', () => {
        const wrapper = chart([
            { label: 'Tech', value: 75 },
            { label: 'Energy', value: 25 },
        ]);

        expect(arcs(wrapper)[0]?.attributes('stroke-dasharray')).toBe('75 25');
        expect(arcs(wrapper)[1]?.attributes('stroke-dasharray')).toBe('25 75');
    });

    it('starts each slice where the one before it ended', () => {
        const wrapper = chart([
            { label: 'Tech', value: 75 },
            { label: 'Energy', value: 25 },
        ]);

        expect(arcs(wrapper)[0]?.attributes('stroke-dashoffset')).toBe('125');
        expect(arcs(wrapper)[1]?.attributes('stroke-dashoffset')).toBe('50');
    });

    it('reads a short position as the exposure it is, not as a negative slice', () => {
        const wrapper = chart([
            { label: 'Long', value: 50 },
            { label: 'Short', value: -50 },
        ]);

        expect(arcs(wrapper)[1]?.attributes('stroke-dasharray')).toBe('50 50');
    });

    it('names each slice with its percentage', () => {
        const wrapper = chart([
            { label: 'Tech', value: 2 },
            { label: 'Energy', value: 1 },
        ]);

        expect(wrapper.findAll('.donut-chart__legend-item')[0]?.text()).toBe('Tech66.7%');
    });

    it('draws nothing but the track when everything nets to zero', () => {
        const wrapper = chart([{ label: 'Cash', value: 0 }]);

        expect(arcs(wrapper)).toHaveLength(0);
        expect(wrapper.findAll('.donut-chart__legend-item')).toHaveLength(0);
    });

    it('draws nothing for an empty allocation', () => {
        expect(arcs(chart([]))).toHaveLength(0);
    });

    it('cycles the palette rather than running out of colours', () => {
        const slices = Array.from({ length: 10 }, (_, index) => ({ label: `S${index}`, value: 1 }));
        const wrapper = chart(slices);

        expect(arcs(wrapper)[8]?.classes()).toContain('donut-chart__slice--0');
    });

    it('highlights the legend row under the pointer', async () => {
        const wrapper = chart([
            { label: 'Tech', value: 1 },
            { label: 'Energy', value: 1 },
        ]);
        const row = wrapper.findAll('.donut-chart__legend-item')[1];

        await row?.trigger('pointerenter');
        expect(row?.classes()).toContain('donut-chart__legend-item--active');

        await row?.trigger('pointerleave');
        expect(row?.classes()).not.toContain('donut-chart__legend-item--active');
    });

    it('highlights from the arc as well as from the legend', async () => {
        const wrapper = chart([
            { label: 'Tech', value: 1 },
            { label: 'Energy', value: 1 },
        ]);

        await arcs(wrapper)[0]?.trigger('pointerenter');

        expect(wrapper.findAll('.donut-chart__legend-item')[0]?.classes()).toContain(
            'donut-chart__legend-item--active',
        );
    });
});
