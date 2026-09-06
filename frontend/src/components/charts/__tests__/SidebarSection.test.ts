import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SidebarSection from '@/components/charts/SidebarSection.vue';

describe('SidebarSection', () => {
    it('makes the title the section heading and renders what it wraps', () => {
        const wrapper = mount(SidebarSection, {
            props: { title: 'Dividends' },
            slots: { default: '<p class="body" />' },
        });

        expect(wrapper.get('h2').text()).toBe('Dividends');
        expect(wrapper.find('.body').exists()).toBe(true);
    });
});
