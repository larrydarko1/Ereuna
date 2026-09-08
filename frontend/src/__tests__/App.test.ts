import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { Router } from 'vue-router';
import { clearAuth } from '@/api/client';
import { mockApi } from '@/__tests__/support/msw';
import { testRouter } from '@/__tests__/support/router';
import App from '@/App.vue';

mockApi();

/** The routes the app renders without its header. */
const BARE = new Set(['Login', 'SignUp', 'Recovery', 'SetPassword']);

const shell = async (path: string): Promise<{ wrapper: VueWrapper; router: Router }> => {
    const router = testRouter();
    // The header is hidden on the routes the app marks `bare` in their meta.
    router.getRoutes().forEach((route) => {
        if (typeof route.name === 'string' && BARE.has(route.name)) route.meta.bare = true;
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

    // The session behind this page has no password until the form is submitted,
    // so the guard bounces every link the header would offer.
    it('hides the header while a recovered session is still setting a password', async () => {
        const { wrapper } = await shell('/set-password');

        expect(wrapper.find('.header').exists()).toBe(false);
    });

    it('renders whatever the route resolved to', async () => {
        const { wrapper } = await shell('/dashboard');

        expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true);
    });

    it('follows the route, showing the header the moment one is not bare', async () => {
        const { wrapper, router } = await shell('/login');
        expect(wrapper.find('.header').exists()).toBe(false);

        await router.push('/dashboard');
        await flushPromises();

        expect(wrapper.find('.header').exists()).toBe(true);
    });
});
