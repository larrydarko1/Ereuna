import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { Router } from 'vue-router';
import { clearAuth } from '@/api/client';
import { mockApi } from '@/__tests__/support/msw';
import { testRouter } from '@/__tests__/support/router';
import { notify } from '@/composables/ui/useNotifications';
import App from '@/App.vue';

mockApi();

const shell = async (path: string): Promise<{ wrapper: VueWrapper; router: Router }> => {
    const router = testRouter();
    // The header is hidden on public routes, which the app marks in its meta.
    router.getRoutes().forEach((route) => {
        if (route.name === 'Login' || route.name === 'SignUp') route.meta.public = true;
    });
    await router.push(path);
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [router] } });
    await flushPromises();
    return { wrapper, router };
};

beforeEach(() => {
    clearAuth();
});

describe('App', () => {
    it('shows the header on a signed-in page', async () => {
        const { wrapper } = await shell('/dashboard');

        expect(wrapper.find('.header').exists()).toBe(true);
    });

    it('hides the header on a public page, which has nothing to navigate to', async () => {
        const { wrapper } = await shell('/login');

        expect(wrapper.find('.header').exists()).toBe(false);
    });

    it('renders whatever the route resolved to', async () => {
        const { wrapper } = await shell('/dashboard');

        expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true);
    });

    it('always hosts the toasts, so a message can reach any page', async () => {
        const { wrapper } = await shell('/login');
        notify('saved');
        await flushPromises();

        expect(wrapper.find('.toasts').exists()).toBe(true);
    });

    it('follows the route, showing the header the moment one is not public', async () => {
        const { wrapper, router } = await shell('/login');
        expect(wrapper.find('.header').exists()).toBe(false);

        await router.push('/dashboard');
        await flushPromises();

        expect(wrapper.find('.header').exists()).toBe(true);
    });
});
