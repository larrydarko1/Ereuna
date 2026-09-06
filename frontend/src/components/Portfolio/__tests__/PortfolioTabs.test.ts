import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { PORTFOLIO_SLOTS } from '@/composables/portfolio/usePortfolios';
import PortfolioTabs from '@/components/portfolio/PortfolioTabs.vue';

const tabs = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(PortfolioTabs, { props: { selected: 0, opened: new Set([0]), blank: false, ...props } });

const action = (wrapper: VueWrapper, index: number): ReturnType<VueWrapper['findAll']>[number] => {
    const node = wrapper.findAll('.portfolio-tabs__actions .btn')[index];
    if (node === undefined) throw new Error(`no action at ${index}`);
    return node;
};

describe('PortfolioTabs', () => {
    it('offers every slot the account has', () => {
        expect(tabs().findAll('.portfolio-tabs__slot')).toHaveLength(PORTFOLIO_SLOTS);
    });

    it('numbers the slots from one while indexing them from zero', async () => {
        const wrapper = tabs();

        expect(wrapper.get('.portfolio-tabs__slot').text()).toBe('1');
        await wrapper.findAll('.portfolio-tabs__slot')[2]?.trigger('click');

        expect(wrapper.emitted('select')?.[0]).toEqual([2]);
    });

    it('marks the selected slot for a screen reader as well as for the eye', () => {
        const slot = tabs({ selected: 1 }).findAll('.portfolio-tabs__slot')[1];

        expect(slot?.attributes('aria-selected')).toBe('true');
        expect(slot?.classes()).toContain('portfolio-tabs__slot--active');
    });

    it('marks the slots that already hold a portfolio', () => {
        const wrapper = tabs({ opened: new Set([0, 3]) });

        expect(wrapper.findAll('.portfolio-tabs__slot--opened')).toHaveLength(2);
    });

    it('is a tablist, so the arrow keys mean what a reader expects', () => {
        expect(tabs().get('[role="tablist"]').findAll('[role="tab"]')).toHaveLength(PORTFOLIO_SLOTS);
    });

    it('asks for each action it offers', async () => {
        const wrapper = tabs();

        await action(wrapper, 0).trigger('click');
        await action(wrapper, 1).trigger('click');
        await action(wrapper, 2).trigger('click');

        expect(wrapper.emitted('trade')).toHaveLength(1);
        expect(wrapper.emitted('cash')).toHaveLength(1);
        expect(wrapper.emitted('settings')).toHaveLength(1);
    });

    it('offers import only into an empty slot', () => {
        expect(action(tabs({ blank: true }), 3).attributes('disabled')).toBeUndefined();
        expect(action(tabs({ blank: false }), 3).attributes('disabled')).toBeDefined();
    });

    it('offers export and reset only where there is something to act on', () => {
        const empty = tabs({ blank: true });

        expect(action(empty, 4).attributes('disabled')).toBeDefined();
        expect(action(empty, 5).attributes('disabled')).toBeDefined();
    });

    it('asks to import, export and reset', async () => {
        const wrapper = tabs({ blank: true });
        await action(wrapper, 3).trigger('click');

        const filled = tabs({ blank: false });
        await action(filled, 4).trigger('click');
        await action(filled, 5).trigger('click');

        expect(wrapper.emitted('import')).toHaveLength(1);
        expect(filled.emitted('export')).toHaveLength(1);
        expect(filled.emitted('reset')).toHaveLength(1);
    });
});
