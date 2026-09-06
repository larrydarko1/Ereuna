import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { dismiss, notify, notifyError, notifySuccess, useNotifications } from '@/composables/ui/useNotifications';
import AppToasts from '@/components/ui/AppToasts.vue';

const { toasts } = useNotifications();

let wrapper: VueWrapper;

beforeEach(() => {
    vi.useFakeTimers();
    for (const toast of [...toasts.value]) dismiss(toast.id);
    wrapper = mount(AppToasts);
});

afterEach(() => {
    wrapper.unmount();
    vi.useRealTimers();
});

describe('AppToasts', () => {
    it('is a named region', () => {
        expect(wrapper.attributes('role')).toBe('region');
        expect(wrapper.attributes('aria-label')).toBe(i18n.global.t('common.notifications'));
    });

    it('renders nothing until something is notified', () => {
        expect(wrapper.findAll('.toast')).toHaveLength(0);
    });

    it('renders a queued message', async () => {
        notify('Portfolio saved');
        await wrapper.vm.$nextTick();

        expect(wrapper.get('.toast__message').text()).toBe('Portfolio saved');
    });

    it('announces an error assertively and everything else politely', async () => {
        notifySuccess('Saved');
        notifyError('Refused');
        await wrapper.vm.$nextTick();

        const rendered = wrapper.findAll('.toast');
        expect(rendered[0]?.attributes('role')).toBe('status');
        expect(rendered[0]?.attributes('aria-live')).toBe('polite');
        expect(rendered[1]?.attributes('role')).toBe('alert');
        expect(rendered[1]?.attributes('aria-live')).toBe('assertive');
    });

    it('marks each tone, so the stripe can differ', async () => {
        notifySuccess('Saved');
        await wrapper.vm.$nextTick();

        expect(wrapper.get('.toast').classes()).toContain('toast--success');
    });

    it('drops one on its dismiss button', async () => {
        notify('Portfolio saved');
        await wrapper.vm.$nextTick();

        await wrapper.get('.toast__dismiss').trigger('click');

        expect(wrapper.findAll('.toast')).toHaveLength(0);
    });

    it('labels the dismiss button', async () => {
        notify('Portfolio saved');
        await wrapper.vm.$nextTick();

        expect(wrapper.get('.toast__dismiss').attributes('aria-label')).toBe(i18n.global.t('common.close'));
    });

    it('empties the queue when the host goes away', async () => {
        notify('Portfolio saved');
        await wrapper.vm.$nextTick();

        wrapper.unmount();

        expect(toasts.value).toHaveLength(0);
    });
});
