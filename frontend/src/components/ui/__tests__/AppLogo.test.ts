import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AppLogo from '@/components/ui/AppLogo.vue';

describe('AppLogo', () => {
    it('is an image with a name by default', () => {
        const wrapper = mount(AppLogo);

        expect(wrapper.attributes('role')).toBe('img');
        expect(wrapper.attributes('aria-label')).toBe('Ereuna');
        expect(wrapper.attributes('aria-hidden')).toBeUndefined();
    });

    it('takes a name of its own', () => {
        const wrapper = mount(AppLogo, { props: { label: 'Ereuna home' } });

        expect(wrapper.attributes('aria-label')).toBe('Ereuna home');
    });

    it('hides itself from a screen reader when it is beside its own name', () => {
        const wrapper = mount(AppLogo, { props: { label: '' } });

        expect(wrapper.attributes('aria-hidden')).toBe('true');
        expect(wrapper.attributes('role')).toBeUndefined();
        expect(wrapper.attributes('aria-label')).toBeUndefined();
    });

    it('is sized in pixels, and the aspect ratio keeps the mask from cropping', () => {
        const wrapper = mount(AppLogo, { props: { width: 120 } });

        expect(wrapper.attributes('style')).toContain('width: 120px');
    });
});
