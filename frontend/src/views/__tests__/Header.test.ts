import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { Router } from 'vue-router';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { testRouter } from '@/__tests__/support/router';
import Header from '@/components/Header.vue';

const api = mockApi();

const header = async (): Promise<{ wrapper: VueWrapper; router: Router }> => {
    const router = testRouter();
    await router.push('/');
    await router.isReady();
    return { wrapper: mount(Header, { global: { plugins: [router] } }), router };
};

beforeEach(() => {
    clearAuth();
});

describe('Header', () => {
    it('links to every page in the app', async () => {
        const { wrapper } = await header();

        expect(wrapper.findAll('.header__nav a').map((node) => node.attributes('href'))).toEqual([
            '/dashboard',
            '/account',
            '/portfolio',
            '/charts',
            '/screener',
        ]);
    });

    it('names the navigation for a screen reader', async () => {
        const { wrapper } = await header();

        expect(wrapper.get('nav').attributes('aria-label')).toBe(i18n.global.t('common.mainNavigation'));
        expect(wrapper.get('.header__mark').attributes('aria-label')).toBe(i18n.global.t('header.nav.dashboard'));
    });

    it('signs out and lands on the sign-in page', async () => {
        api.on('POST /api/auth/logout', null, { status: 204 });
        const { wrapper, router } = await header();

        await wrapper.get('.header__link--button').trigger('click');
        await flushPromises();

        expect(api.last().path).toBe('/api/auth/logout');
        expect(router.currentRoute.value.name).toBe('Login');
    });

    it('still signs out locally when the request fails', async () => {
        api.on('POST /api/auth/logout', { error: 'INTERNAL' }, { status: 500 });
        const { wrapper, router } = await header();

        await wrapper.get('.header__link--button').trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.name).toBe('Login');
    });

    it('signs out once however fast the button is pressed', async () => {
        api.on('POST /api/auth/logout', null, { status: 204 });
        const { wrapper } = await header();

        await wrapper.get('.header__link--button').trigger('click');
        await wrapper.get('.header__link--button').trigger('click');
        await flushPromises();

        expect(api.calls.filter((call) => call.path === '/api/auth/logout')).toHaveLength(1);
    });
});
