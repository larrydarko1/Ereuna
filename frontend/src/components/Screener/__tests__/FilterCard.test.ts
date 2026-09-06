import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import FilterCard from '@/components/screener/FilterCard.vue';

const card = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(FilterCard, { props: { label: 'Market cap', ...props }, slots: { default: '<p class="body" />' } });

describe('FilterCard', () => {
    it('starts closed while the filter is unset', () => {
        expect(card().get('.filter-card__toggle').attributes('aria-expanded')).toBe('false');
    });

    it('starts open when the filter already has a value', () => {
        expect(card({ summary: '1 – 2' }).get('.filter-card__toggle').attributes('aria-expanded')).toBe('true');
    });

    it('opens itself when the filter gains a value', async () => {
        const wrapper = card();

        await wrapper.setProps({ summary: '1 – 2' });

        expect(wrapper.get('.filter-card__toggle').attributes('aria-expanded')).toBe('true');
    });

    it('stays open when a set filter changes value', async () => {
        const wrapper = card({ summary: '1 – 2' });
        await wrapper.get('.filter-card__toggle').trigger('click');

        await wrapper.setProps({ summary: '3 – 4' });

        expect(wrapper.get('.filter-card__toggle').attributes('aria-expanded')).toBe('false');
    });

    it('opens and closes on the toggle', async () => {
        const wrapper = card();

        await wrapper.get('.filter-card__toggle').trigger('click');
        expect(wrapper.get('.filter-card__toggle').attributes('aria-expanded')).toBe('true');

        await wrapper.get('.filter-card__toggle').trigger('click');
        expect(wrapper.get('.filter-card__toggle').attributes('aria-expanded')).toBe('false');
    });

    it('points the toggle at the body it controls', () => {
        const wrapper = card();

        expect(wrapper.get('.filter-card__toggle').attributes('aria-controls')).toBe(
            wrapper.get('.filter-card__body').attributes('id'),
        );
    });

    it('renders the control it wraps', () => {
        expect(card().find('.body').exists()).toBe(true);
    });

    it('marks itself active only while the filter is set', () => {
        expect(card().classes()).not.toContain('filter-card--active');
        expect(card({ summary: '1 – 2' }).classes()).toContain('filter-card--active');
    });

    it('offers a clear only for a filter that is set', () => {
        expect(card().find('.filter-card__clear').exists()).toBe(false);

        const wrapper = card({ summary: '1 – 2' });
        expect(wrapper.get('.filter-card__clear').attributes('aria-label')).toBe(
            i18n.global.t('screener.clearFilter', { name: 'Market cap' }),
        );
    });

    it('asks to be cleared', async () => {
        const wrapper = card({ summary: '1 – 2' });

        await wrapper.get('.filter-card__clear').trigger('click');

        expect(wrapper.emitted('clear')).toHaveLength(1);
    });

    it('cannot be opened when the dataset has nothing to range over', () => {
        const wrapper = card({ available: false });

        expect(wrapper.get('.filter-card__toggle').attributes('disabled')).toBeDefined();
        expect(wrapper.get('.filter-card__summary').text()).toBe(i18n.global.t('screener.noData'));
    });

    it('prefers the value over the no-data note when it has both', () => {
        expect(card({ available: false, summary: '1 – 2' }).get('.filter-card__summary').text()).toBe('1 – 2');
    });

    it('shows the tip when the locale has written one', () => {
        expect(card().find('.filter-card__tip').exists()).toBe(false);
        expect(card({ tip: 'Shares times price' }).get('.filter-card__tip').text()).toBe('Shares times price');
    });

    it('locks the clear while a write is in flight', () => {
        expect(card({ summary: '1 – 2', busy: true }).get('.filter-card__clear').attributes('disabled')).toBeDefined();
    });
});
