import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import BarChart from '@/components/viz/BarChart.vue';

const bars = (values: number[]): { label: string; value: number }[] =>
    values.map((value, index) => ({ label: `Bar ${index}`, value }));

const chart = (props: InstanceType<typeof BarChart>['$props']): VueWrapper => mount(BarChart, { props });

const rects = (wrapper: VueWrapper): { y: number; height: number; x: number }[] =>
    wrapper.findAll('rect').map((node) => ({
        x: Number(node.attributes('x')),
        y: Number(node.attributes('y')),
        height: Number(node.attributes('height')),
    }));

describe('BarChart', () => {
    it('is an image named by its caption', () => {
        const wrapper = chart({ bars: bars([1, 2]), label: 'Monthly returns' });

        expect(wrapper.get('svg').attributes('role')).toBe('img');
        expect(wrapper.get('svg').attributes('aria-label')).toBe('Monthly returns');
        expect(wrapper.get('figcaption').text()).toBe('Monthly returns');
    });

    it('draws one bar per value', () => {
        expect(chart({ bars: bars([1, 2, 3]) }).findAll('rect')).toHaveLength(3);
    });

    it('draws nothing but the baseline for an empty series', () => {
        const wrapper = chart({ bars: [] });

        expect(wrapper.findAll('rect')).toHaveLength(0);
        expect(wrapper.findAll('line')).toHaveLength(1);
    });

    it('keeps zero in frame, so a small gain does not read as a large one', () => {
        const wrapper = chart({ bars: bars([5, 10]) });
        const baseline = Number(wrapper.get('.bar-chart__baseline').attributes('y1'));
        const drawn = rects(wrapper);

        // Every bar hangs off the baseline, and the shorter one is shorter.
        expect(drawn[0]?.y).toBeCloseTo(baseline - (drawn[0]?.height ?? 0));
        expect(drawn[0]?.height).toBeLessThan(drawn[1]?.height ?? 0);
    });

    it('hangs a loss below the baseline and a gain above it', () => {
        const wrapper = chart({ bars: bars([10, -10]) });
        const baseline = Number(wrapper.get('.bar-chart__baseline').attributes('y1'));
        const [gain, loss] = rects(wrapper);

        expect(gain?.y).toBeLessThan(baseline);
        expect(loss?.y).toBe(baseline);
    });

    it('colours by sign', () => {
        const wrapper = chart({ bars: bars([1, -1]) });
        const drawn = wrapper.findAll('rect');

        expect(drawn[0]?.classes()).toContain('bar-chart__bar--up');
        expect(drawn[1]?.classes()).toContain('bar-chart__bar--down');
    });

    it('lets a bar declare its own direction — a falling cost is a good month', () => {
        const wrapper = chart({ bars: [{ label: 'Costs', value: -5, positive: true }] });

        expect(wrapper.get('rect').classes()).toContain('bar-chart__bar--up');
    });

    it('draws something for every non-zero bar, however small', () => {
        const wrapper = chart({ bars: bars([1000, 0.0001]) });

        expect(rects(wrapper)[1]?.height).toBeGreaterThanOrEqual(1);
    });

    it('draws nothing for a bar of exactly zero', () => {
        const wrapper = chart({ bars: bars([10, 0]) });

        expect(rects(wrapper)[1]?.height).toBe(0);
    });

    it('survives a flat series rather than dividing by zero', () => {
        const wrapper = chart({ bars: bars([5, 5, 5]) });

        for (const drawn of rects(wrapper)) expect(Number.isFinite(drawn.height)).toBe(true);
    });

    it('marks the bar it is told to', () => {
        const wrapper = chart({ bars: bars([1, 2, 3]), marker: 1 });

        expect(wrapper.find('.bar-chart__marker').exists()).toBe(true);
    });

    it('draws no marker for an index outside the series', () => {
        expect(
            chart({ bars: bars([1, 2]), marker: 5 })
                .find('.bar-chart__marker')
                .exists(),
        ).toBe(false);
        expect(
            chart({ bars: bars([1, 2]), marker: -1 })
                .find('.bar-chart__marker')
                .exists(),
        ).toBe(false);
        expect(
            chart({ bars: bars([1, 2]), marker: null })
                .find('.bar-chart__marker')
                .exists(),
        ).toBe(false);
    });

    it('reads out the bar under the pointer, formatted', async () => {
        const wrapper = chart({
            bars: bars([1.5, 2]),
            label: 'Monthly returns',
            format: (value: number) => `${value.toFixed(2)}%`,
        });

        await wrapper.findAll('rect')[0]?.trigger('pointerenter');

        expect(wrapper.get('figcaption').text()).toContain('Bar 0');
        expect(wrapper.get('figcaption').text()).toContain('1.50%');
    });

    it('goes back to its own name when the pointer leaves', async () => {
        const wrapper = chart({ bars: bars([1]), label: 'Monthly returns' });
        await wrapper.findAll('rect')[0]?.trigger('pointerenter');

        await wrapper.get('svg').trigger('pointerleave');

        expect(wrapper.get('figcaption').text()).toBe('Monthly returns');
    });
});
