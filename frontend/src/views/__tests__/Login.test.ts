import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { Router } from 'vue-router';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { testRouter } from '@/__tests__/support/router';
import { dismiss, useNotifications } from '@/composables/ui/useNotifications';
import Login from '@/views/Login.vue';

const api = mockApi();

const { toasts } = useNotifications();

const USER = { id: 'u1', username: 'larry', twoFactorEnabled: false };

const view = async (path = '/login'): Promise<{ wrapper: VueWrapper; router: Router }> => {
    const router = testRouter();
    await router.push(path);
    await router.isReady();
    const wrapper = mount(Login, { global: { plugins: [router] } });
    return { wrapper, router };
};

const fill = async (wrapper: VueWrapper, username: string, password: string): Promise<void> => {
    await wrapper.findAll('input')[0]?.setValue(username);
    await wrapper.findAll('input')[1]?.setValue(password);
};

const submit = async (wrapper: VueWrapper): Promise<void> => {
    await wrapper.get('form.login').trigger('submit');
    await flushPromises();
};

/** Type a code into the second-factor prompt and verify it, as a user would. */
const verify = async (wrapper: VueWrapper, code: string): Promise<void> => {
    await wrapper.get('.prompt__digit').setValue(code);
    await wrapper.get('.prompt__verify').trigger('click');
    await flushPromises();
};

beforeEach(() => {
    clearAuth();
    for (const toast of [...toasts.value]) dismiss(toast.id);
    api.on('GET /api/preferences', {
        language: 'en',
        theme: null,
        defaultSymbol: 'AAPL',
        hiddenSymbols: [],
        chartSettings: null,
        panels: null,
        screenerColumns: [],
    });
});

describe('Login', () => {
    it('will not submit an incomplete form', async () => {
        const { wrapper } = await view();

        await fill(wrapper, '  ', 'secret');
        await submit(wrapper);

        expect(wrapper.get('.login__submit').attributes('disabled')).toBeDefined();
        expect(api.calls.filter((call) => call.path === '/api/auth/login')).toHaveLength(0);
    });

    it('signs in with the trimmed username and lands on the dashboard', async () => {
        api.on('POST /api/auth/login', { accessToken: 'token', user: USER });
        const { wrapper, router } = await view();

        await fill(wrapper, ' larry ', 'secret');
        await submit(wrapper);

        expect(api.calls[0]?.body).toEqual({ username: 'larry', password: 'secret', rememberMe: false });
        expect(router.currentRoute.value.name).toBe('Dashboard');
    });

    it('remembers the session when asked to', async () => {
        api.on('POST /api/auth/login', { accessToken: 'token', user: USER });
        const { wrapper } = await view();

        await fill(wrapper, 'larry', 'secret');
        await wrapper.get('.login__remember input').setValue(true);
        await submit(wrapper);

        expect(api.calls[0]?.body).toMatchObject({ rememberMe: true });
    });

    it('resumes where an expired session left off', async () => {
        api.on('POST /api/auth/login', { accessToken: 'token', user: USER });
        const { wrapper, router } = await view('/login?redirect=/portfolio');

        await fill(wrapper, 'larry', 'secret');
        await submit(wrapper);

        expect(router.currentRoute.value.path).toBe('/portfolio');
    });

    it('refuses to be pointed off-site, which would make it an open redirect', async () => {
        api.on('POST /api/auth/login', { accessToken: 'token', user: USER });
        const { wrapper, router } = await view('/login?redirect=//evil.example.com');

        await fill(wrapper, 'larry', 'secret');
        await submit(wrapper);

        expect(router.currentRoute.value.name).toBe('Dashboard');
    });

    it('ignores a redirect that is not a path at all', async () => {
        api.on('POST /api/auth/login', { accessToken: 'token', user: USER });
        const { wrapper, router } = await view('/login?redirect=https://evil.example.com');

        await fill(wrapper, 'larry', 'secret');
        await submit(wrapper);

        expect(router.currentRoute.value.name).toBe('Dashboard');
    });

    it('says nothing about which half of the credentials was wrong', async () => {
        api.on('POST /api/auth/login', { error: 'INVALID_CREDENTIALS' }, { status: 401 });
        const { wrapper, router } = await view();

        await fill(wrapper, 'larry', 'wrong');
        await submit(wrapper);

        expect(toasts.value[0]?.tone).toBe('error');
        expect(wrapper.findAll('.field__error')).toHaveLength(0);
        expect(router.currentRoute.value.name).toBe('Login');
    });

    it('asks for the second factor rather than entering the app', async () => {
        api.on('POST /api/auth/login', { requires2FA: true, tempToken: 'temp' });
        const { wrapper, router } = await view();

        await fill(wrapper, 'larry', 'secret');
        await submit(wrapper);

        expect(wrapper.find('.prompt').exists()).toBe(true);
        expect(router.currentRoute.value.name).toBe('Login');
    });

    it('enters the app once the code checks out', async () => {
        api.on('POST /api/auth/login', { requires2FA: true, tempToken: 'temp' });
        api.on('POST /api/auth/2fa/validate', { accessToken: 'token', user: USER });
        const { wrapper, router } = await view();
        await fill(wrapper, 'larry', 'secret');
        await submit(wrapper);

        await verify(wrapper, '123456');

        const validate = api.calls.find((call) => call.path === '/api/auth/2fa/validate');
        expect(validate?.body).toMatchObject({ tempToken: 'temp', code: '123456' });
        expect(router.currentRoute.value.name).toBe('Dashboard');
    });

    it('keeps the prompt up and complains when the code is wrong', async () => {
        api.on('POST /api/auth/login', { requires2FA: true, tempToken: 'temp' });
        api.on('POST /api/auth/2fa/validate', { error: 'INVALID_TWO_FA_CODE' }, { status: 400 });
        const { wrapper, router } = await view();
        await fill(wrapper, 'larry', 'secret');
        await submit(wrapper);

        await verify(wrapper, '000000');

        expect(toasts.value[0]?.message).toBe(i18n.global.t('errors.INVALID_TWO_FA_CODE'));
        expect(wrapper.find('.prompt').exists()).toBe(true);
        expect(router.currentRoute.value.name).toBe('Login');
    });

    it('drops the temp token on cancel, so the half-finished sign-in cannot be resumed', async () => {
        api.on('POST /api/auth/login', { requires2FA: true, tempToken: 'temp' });
        const { wrapper } = await view();
        await fill(wrapper, 'larry', 'secret');
        await submit(wrapper);

        await wrapper.get('.prompt__cancel').trigger('click');
        await flushPromises();

        expect(wrapper.find('.prompt').exists()).toBe(false);
        expect((wrapper.findAll('input')[1]?.element as HTMLInputElement).value).toBe('');
    });

    it('offers the way to recovery and to signing up', async () => {
        const { wrapper } = await view();
        const links = wrapper.findAll('.login__links a').map((node) => node.attributes('href'));

        expect(links).toEqual(['/recovery', '/signup']);
    });
});
