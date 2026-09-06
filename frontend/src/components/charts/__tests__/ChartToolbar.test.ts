import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { CHART_TOOLS, type ChartTool } from '@/constants/chart';
import { i18n } from '@/i18n';
import ChartToolbar from '@/components/charts/ChartToolbar.vue';

const toolbar = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(ChartToolbar, { props: { modelValue: null, ...props } });

const named = (wrapper: VueWrapper, label: string): ReturnType<VueWrapper['findAll']>[number] => {
    const node = wrapper.findAll('.toolbar__button').find((button) => button.attributes('aria-label') === label);
    if (node === undefined) throw new Error(`no button labelled ${label}`);
    return node;
};

describe('ChartToolbar', () => {
    it('is a toolbar a screen reader can name', () => {
        expect(toolbar().get('[role="toolbar"]').attributes('aria-label')).toBe(i18n.global.t('charts.tools.label'));
    });

    it('offers every drawing tool the chart knows', () => {
        const wrapper = toolbar();

        for (const tool of CHART_TOOLS) {
            expect(named(wrapper, i18n.global.t(`charts.tools.${tool}`)).exists()).toBe(true);
        }
    });

    it('picks up a tool', async () => {
        const wrapper = toolbar();

        await named(wrapper, i18n.global.t('charts.tools.ruler')).trigger('click');

        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['ruler']);
    });

    it('puts the tool down again when it is picked twice, going back to panning', async () => {
        const wrapper = toolbar({ modelValue: 'ruler' satisfies ChartTool });

        await named(wrapper, i18n.global.t('charts.tools.ruler')).trigger('click');

        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null]);
    });

    it('swaps one tool for another rather than putting it down', async () => {
        const wrapper = toolbar({ modelValue: 'ruler' satisfies ChartTool });

        await named(wrapper, i18n.global.t('charts.tools.box')).trigger('click');

        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['box']);
    });

    it('marks the tool in hand as pressed, and only that one', () => {
        const wrapper = toolbar({ modelValue: 'text' satisfies ChartTool });

        expect(wrapper.findAll('.toolbar__button[aria-pressed="true"]')).toHaveLength(1);
        expect(named(wrapper, i18n.global.t('charts.tools.text')).classes()).toContain('toolbar__button--active');
    });

    it('offers the clear only once there is something drawn to clear', async () => {
        expect(
            toolbar()
                .findAll('.toolbar__button')
                .map((node) => node.attributes('aria-label')),
        ).not.toContain(i18n.global.t('charts.tools.clear'));

        const wrapper = toolbar({ hasDrawings: true });
        await named(wrapper, i18n.global.t('charts.tools.clear')).trigger('click');

        expect(wrapper.emitted('clear')).toHaveLength(1);
    });

    it('offers the signals only once the chart has some', async () => {
        expect(
            toolbar()
                .findAll('.toolbar__button')
                .map((node) => node.attributes('aria-label')),
        ).not.toContain(i18n.global.t('charts.signals.title'));

        const wrapper = toolbar({ hasSignals: true });
        await named(wrapper, i18n.global.t('charts.signals.title')).trigger('click');

        expect(wrapper.emitted('signals')).toHaveLength(1);
    });

    it('marks the pattern overlay as pressed while it is shown', () => {
        expect(named(toolbar({ patternsShown: true }), i18n.global.t('charts.tools.patterns')).classes()).toContain(
            'toolbar__button--active',
        );
    });

    it('asks for the patterns, a screenshot and the settings', async () => {
        const wrapper = toolbar();

        await named(wrapper, i18n.global.t('charts.tools.patterns')).trigger('click');
        await named(wrapper, i18n.global.t('charts.tools.screenshot')).trigger('click');
        await named(wrapper, i18n.global.t('charts.settings.title')).trigger('click');

        expect(wrapper.emitted('patterns')).toHaveLength(1);
        expect(wrapper.emitted('screenshot')).toHaveLength(1);
        expect(wrapper.emitted('settings')).toHaveLength(1);
    });

    it('offers to start the replay, and to leave it once it is running', async () => {
        const idle = toolbar();
        const running = toolbar({ replaying: true });

        await named(idle, i18n.global.t('charts.replay.start')).trigger('click');

        expect(idle.emitted('replay')).toHaveLength(1);
        expect(named(running, i18n.global.t('charts.replay.exit')).classes()).toContain('toolbar__button--active');
    });
});
