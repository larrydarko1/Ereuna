import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import ResultsToolbar from '@/components/screener/ResultsToolbar.vue';
import { LIST_MODES } from '@/constants/screener';

const toolbar = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(ResultsToolbar, {
        props: { total: 12, exportLimit: 5000, mode: 'screener', autoplay: false, ...props },
    });

const action = (wrapper: VueWrapper, label: string): ReturnType<VueWrapper['get']> => {
    const node = wrapper.findAll('.toolbar__action').find((button) => button.text() === label);
    if (node === undefined) throw new Error(`no action labelled ${label}`);
    return node;
};

describe('ResultsToolbar', () => {
    it('offers every list the results table can show', () => {
        expect(toolbar().findAll('.toolbar__mode')).toHaveLength(LIST_MODES.length);
    });

    it('marks the mode in use as pressed, and only that one', () => {
        const wrapper = toolbar({ mode: 'hidden' });
        const pressed = wrapper.findAll('.toolbar__mode[aria-pressed="true"]');

        expect(pressed).toHaveLength(1);
        expect(pressed[0]?.text()).toBe(i18n.global.t('screener.modes.hidden'));
    });

    it('asks the parent for a different list rather than switching one of its own', async () => {
        const wrapper = toolbar();

        await wrapper.findAll('.toolbar__mode')[1]?.trigger('click');

        expect(wrapper.emitted('update:mode')?.[0]).toEqual(['combined']);
    });

    it('reports how many rows the current list holds', () => {
        expect(toolbar({ total: 12 }).get('.toolbar__count').text()).toBe(
            i18n.global.t('screener.resultsCount', { count: 12 }),
        );
    });

    it('asks for the columns dialog and for an export', async () => {
        const wrapper = toolbar();

        await action(wrapper, i18n.global.t('screener.columnsTitle')).trigger('click');
        await action(wrapper, i18n.global.t('common.download')).trigger('click');

        expect(wrapper.emitted('columns')).toHaveLength(1);
        expect(wrapper.emitted('export')).toHaveLength(1);
    });

    it('refuses to export a list with nothing in it', () => {
        expect(action(toolbar({ total: 0 }), i18n.global.t('common.download')).attributes('disabled')).toBeDefined();
    });

    it('says it is working, and refuses a second export while it is', () => {
        const wrapper = toolbar({ exporting: true });

        expect(action(wrapper, i18n.global.t('screener.downloading')).attributes('disabled')).toBeDefined();
    });

    it('toggles autoplay through the parent', async () => {
        const wrapper = toolbar({ autoplay: false });

        await action(wrapper, i18n.global.t('screener.autoplay')).trigger('click');

        expect(wrapper.emitted('update:autoplay')?.[0]).toEqual([true]);
    });

    it('shows autoplay as pressed while it is running', () => {
        expect(action(toolbar({ autoplay: true }), i18n.global.t('screener.autoplay')).classes()).toContain(
            'toolbar__action--active',
        );
    });
});
