import { describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import LineChart from '@/components/viz/LineChart.vue';

const points = (values: number[]): { label: string; value: number }[] =>
    values.map((value, index) => ({ label: `Day ${index}`, value }));

const chart = (props: InstanceType<typeof LineChart>['$props']): VueWrapper => mount(LineChart, { props });

/** VTU cannot set `clientX` on the event it builds, so the event is real. */
const move = async (wrapper: VueWrapper, clientX: number): Promise<void> => {
    wrapper.get('svg').element.dispatchEvent(new MouseEvent('pointermove', { clientX, bubbles: true }));
    await wrapper.vm.$nextTick();
};

/** jsdom runs no layout, so the SVG has to be told how wide it is on screen. */
const withWidth = (wrapper: VueWrapper, width: number): void => {
    vi.spyOn(wrapper.get('svg').element, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        width,
        top: 0,
        height: 300,
        right: width,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    });
};

describe('LineChart', () => {
    it('is an image named by its caption', () => {
        const wrapper = chart({ points: points([1, 2]), label: 'Portfolio value' });

        expect(wrapper.get('svg').attributes('aria-label')).toBe('Portfolio value');
        expect(wrapper.get('figcaption').text()).toBe('Portfolio value');
    });

    it('draws a line and the area under it', () => {
        const wrapper = chart({ points: points([1, 2, 3]) });

        expect(wrapper.get('.line-chart__line').attributes('d')).toMatch(/^M0\.00,/);
        expect(wrapper.get('.line-chart__area').attributes('d')).toMatch(/Z$/);
    });

    it('spans the full width, ending at the last point', () => {
        const wrapper = chart({ points: points([1, 2, 3]) });

        expect(wrapper.get('.line-chart__line').attributes('d')).toContain('L1000.00,');
    });

    it('draws nothing at all for an empty series', () => {
        const wrapper = chart({ points: [] });

        expect(wrapper.find('.line-chart__line').exists()).toBe(false);
    });

    it('draws a portfolio one day old as a flat line rather than an error', () => {
        const wrapper = chart({ points: points([100]) });

        expect(wrapper.get('.line-chart__line').attributes('d')).toBe('M500.00,150.00');
    });

    it('centres a flat series rather than dividing by zero', () => {
        const wrapper = chart({ points: points([100, 100, 100]) });
        const d = wrapper.get('.line-chart__line').attributes('d') ?? '';

        expect(d).not.toContain('NaN');
        expect(d).toContain('M0.00,150.00');
    });

    it('reads out the point under the pointer, formatted', async () => {
        const wrapper = chart({
            points: points([100, 200, 300]),
            label: 'Portfolio value',
            format: (value: number) => `$${value}`,
        });
        withWidth(wrapper, 600);

        await move(wrapper, 600);

        expect(wrapper.get('figcaption').text()).toContain('Day 2');
        expect(wrapper.get('figcaption').text()).toContain('$300');
    });

    it('draws a crosshair at the point it is reading out', async () => {
        const wrapper = chart({ points: points([100, 200]) });
        withWidth(wrapper, 600);

        await move(wrapper, 0);

        expect(wrapper.find('.line-chart__crosshair').exists()).toBe(true);
        expect(wrapper.get('.line-chart__dot').attributes('cx')).toBe('0');
    });

    it('clamps a pointer that left the box', async () => {
        const wrapper = chart({ points: points([100, 200, 300]) });
        withWidth(wrapper, 600);

        await move(wrapper, 5000);

        expect(wrapper.get('figcaption').text()).toContain('Day 2');
    });

    it('goes back to its own name when the pointer leaves', async () => {
        const wrapper = chart({ points: points([100, 200]), label: 'Portfolio value' });
        withWidth(wrapper, 600);
        await move(wrapper, 0);

        await wrapper.get('svg').trigger('pointerleave');

        expect(wrapper.get('figcaption').text()).toBe('Portfolio value');
    });

    it('ignores a pointer over an empty chart', async () => {
        const wrapper = chart({ points: [], label: 'Portfolio value' });

        await move(wrapper, 100);

        expect(wrapper.get('figcaption').text()).toBe('Portfolio value');
    });

    it('ignores a pointer before the chart has been laid out', async () => {
        const wrapper = chart({ points: points([1, 2]), label: 'Portfolio value' });
        withWidth(wrapper, 0);

        await move(wrapper, 100);

        expect(wrapper.get('figcaption').text()).toBe('Portfolio value');
    });
});
