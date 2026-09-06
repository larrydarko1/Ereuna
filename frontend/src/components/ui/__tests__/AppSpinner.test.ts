import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { i18n } from '@/i18n';
import AppSpinner from '@/components/ui/AppSpinner.vue';

describe('AppSpinner', () => {
    it('announces itself as busy, with a translated label', () => {
        const wrapper = mount(AppSpinner);

        expect(wrapper.attributes('role')).toBe('status');
        expect(wrapper.text()).toBe(i18n.global.t('common.loading'));
    });

    it('takes a label of its own', () => {
        const wrapper = mount(AppSpinner, { props: { label: 'Loading prices' } });

        expect(wrapper.text()).toBe('Loading prices');
    });

    it('defaults to the medium size', () => {
        expect(mount(AppSpinner).classes()).toContain('spinner--md');
    });

    it.each(['sm', 'md', 'lg'] as const)('renders at %s', (size) => {
        expect(mount(AppSpinner, { props: { size } }).classes()).toContain(`spinner--${size}`);
    });

    it('hides the artwork from a screen reader — the label already says it', () => {
        const wrapper = mount(AppSpinner);

        expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true');
    });
});
