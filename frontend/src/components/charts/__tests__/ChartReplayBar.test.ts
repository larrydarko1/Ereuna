import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import ChartReplayBar from '@/components/charts/ChartReplayBar.vue';

const bar = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(ChartReplayBar, {
        props: { playing: false, progress: 40, label: '4 March 2026', speed: 1, ...props },
    });

const named = (wrapper: VueWrapper, label: string): ReturnType<VueWrapper['findAll']>[number] => {
    const node = wrapper.findAll('.replay__button').find((button) => button.attributes('aria-label') === label);
    if (node === undefined) throw new Error(`no button labelled ${label}`);
    return node;
};

describe('ChartReplayBar', () => {
    it('is a group a screen reader can name', () => {
        expect(bar().get('[role="group"]').attributes('aria-label')).toBe(i18n.global.t('charts.replay.title'));
    });

    it('offers play while it is paused, and pause while it is running', () => {
        expect(named(bar(), i18n.global.t('charts.replay.play')).exists()).toBe(true);
        expect(named(bar({ playing: true }), i18n.global.t('charts.replay.pause')).exists()).toBe(true);
    });

    it('asks to start and stop', async () => {
        const wrapper = bar();

        await named(wrapper, i18n.global.t('charts.replay.play')).trigger('click');

        expect(wrapper.emitted('toggle')).toHaveLength(1);
    });

    it('steps one bar in either direction', async () => {
        const wrapper = bar();

        await named(wrapper, i18n.global.t('charts.replay.stepForward')).trigger('click');
        await named(wrapper, i18n.global.t('charts.replay.stepBackward')).trigger('click');

        expect(wrapper.emitted('step')).toEqual([[1], [-1]]);
    });

    it('offers a range of speeds and reports the one picked as a number', async () => {
        const wrapper = bar();

        expect(wrapper.findAll('option').map((node) => node.text())).toEqual(['0.5×', '1×', '2×', '5×', '10×']);

        await wrapper.get('.replay__speed').setValue('5');

        expect(wrapper.emitted('update:speed')?.[0]).toEqual([5]);
    });

    it('shows the scrubber where the replay has got to', () => {
        expect((bar({ progress: 40 }).get('.replay__scrubber').element as HTMLInputElement).value).toBe('40');
    });

    it('seeks to the position the scrubber was dragged to', async () => {
        const wrapper = bar();

        await wrapper.get('.replay__scrubber').setValue('75');

        expect(wrapper.emitted('seek')?.[0]).toEqual([75]);
    });

    it('reads the date out on the scrubber as well as beside it', () => {
        const wrapper = bar({ label: '4 March 2026' });

        expect(wrapper.get('.replay__scrubber').attributes('aria-valuetext')).toBe('4 March 2026');
        expect(wrapper.get('.replay__date').text()).toBe('4 March 2026');
    });
});
