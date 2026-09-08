import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import AppTooltip from '@/components/ui/AppTooltip.vue';

const tooltip = (): VueWrapper =>
    mount(AppTooltip, {
        attachTo: document.body,
        slots: { default: '<span class="badge">2</span>', content: 'Growth\nValue' },
    });

const bubble = (): HTMLElement | null => document.body.querySelector('.app-tooltip__bubble');

const hover = async (wrapper: VueWrapper, event: 'mouseenter' | 'mouseleave' | 'focus' | 'blur'): Promise<void> => {
    await wrapper.get('.app-tooltip').trigger(event);
    await flushPromises();
};

beforeEach(() => {
    document.body.innerHTML = '';
});

describe('AppTooltip', () => {
    it('shows nothing until the trigger is pointed at', () => {
        const wrapper = tooltip();

        expect(wrapper.get('.badge').text()).toBe('2');
        expect(bubble()).toBeNull();
        wrapper.unmount();
    });

    it('opens on hover and closes again', async () => {
        const wrapper = tooltip();

        await hover(wrapper, 'mouseenter');
        expect(bubble()?.textContent).toContain('Growth');

        await hover(wrapper, 'mouseleave');
        expect(bubble()).toBeNull();
        wrapper.unmount();
    });

    // Hover alone would put the names behind a pointer nobody has.
    it('opens on focus, so the keyboard reaches it too', async () => {
        const wrapper = tooltip();

        await hover(wrapper, 'focus');

        expect(bubble()).not.toBeNull();
        wrapper.unmount();
    });

    /**
     * The reason this component exists rather than a CSS bubble: the tables that
     * use it scroll horizontally inside a clipped column, and anything rendered
     * inside that column is cut off at its edge.
     */
    it('renders the bubble outside the element it was triggered from', async () => {
        const wrapper = tooltip();

        await hover(wrapper, 'mouseenter');

        expect(wrapper.get('.app-tooltip').element.contains(bubble())).toBe(false);
        expect(bubble()?.parentElement).toBe(document.body);
        wrapper.unmount();
    });

    it('describes the trigger only while the bubble is on screen', async () => {
        const wrapper = tooltip();
        expect(wrapper.get('.app-tooltip').attributes('aria-describedby')).toBeUndefined();

        await hover(wrapper, 'mouseenter');

        expect(wrapper.get('.app-tooltip').attributes('aria-describedby')).toBe(bubble()?.id);
        wrapper.unmount();
    });

    // Fixed coordinates are measured once, so anything that moves the trigger
    // afterwards would leave the bubble stranded where the trigger used to be.
    it('closes when the page scrolls under it', async () => {
        const wrapper = tooltip();
        await hover(wrapper, 'mouseenter');

        document.body.dispatchEvent(new Event('scroll', { bubbles: true }));
        await flushPromises();

        expect(bubble()).toBeNull();
        wrapper.unmount();
    });
});
