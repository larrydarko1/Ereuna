import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import type { Component } from 'vue';

const ICONS = Object.entries(import.meta.glob<Component>('../*.vue', { eager: true, import: 'default' }));

describe('icons', () => {
    it('finds the icon components', () => {
        expect(ICONS.length).toBeGreaterThan(0);
    });

    it.each(ICONS)('%s renders a decorative svg', (_, icon) => {
        const wrapper = mount(icon);

        expect(wrapper.element).toBeInstanceOf(SVGSVGElement);
        expect(wrapper.attributes('aria-hidden')).toBe('true');
    });
});
