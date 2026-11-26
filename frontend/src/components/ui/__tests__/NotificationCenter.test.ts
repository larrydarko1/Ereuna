import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import NotificationCenter from '@/components/ui/NotificationCenter.vue';
import { notify, useNotifications } from '@/composables/ui/useNotifications';

const { notifications, dismiss, resume } = useNotifications();

afterEach(() => {
    resume();
    for (const notification of [...notifications.value]) dismiss(notification.id);
    vi.useRealTimers();
});

describe('NotificationCenter', () => {
    it('renders each error as an alert', async () => {
        const wrapper = mount(NotificationCenter);
        notify.error('Could not export the chart.');
        notify.error('Could not copy.');
        await nextTick();
        const items = wrapper.findAll('li');
        expect(items.map((item) => item.attributes('role'))).toEqual(['alert', 'alert']);
        expect(items[0]?.text()).toContain('Could not export the chart.');
    });

    it('labels the dismiss button for a screen reader', async () => {
        const wrapper = mount(NotificationCenter);
        notify.error('Could not export the chart.');
        await nextTick();
        expect(wrapper.get('button').attributes('aria-label')).toBe('Dismiss');
    });

    it('removes a notification when its dismiss button is clicked', async () => {
        const wrapper = mount(NotificationCenter);
        notify.error('Could not save.', { persistent: true });
        await nextTick();
        await wrapper.get('button').trigger('click');
        expect(notifications.value).toEqual([]);
    });

    it('keeps notifications on screen while the pointer is over them', async () => {
        vi.useFakeTimers();
        const wrapper = mount(NotificationCenter);
        notify.error('Could not export the chart.');
        await nextTick();
        await wrapper.get('li').trigger('mouseenter');
        vi.advanceTimersByTime(60_000);
        expect(notifications.value).toHaveLength(1);
        await wrapper.get('li').trigger('mouseleave');
        vi.advanceTimersByTime(6000);
        expect(notifications.value).toEqual([]);
    });

    it('keeps notifications on screen while keyboard focus is inside them', async () => {
        vi.useFakeTimers();
        const wrapper = mount(NotificationCenter);
        notify.error('Could not export the chart.');
        await nextTick();
        await wrapper.get('li').trigger('focusin');
        vi.advanceTimersByTime(60_000);
        expect(notifications.value).toHaveLength(1);
    });
});
