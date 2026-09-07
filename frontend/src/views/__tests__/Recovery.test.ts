import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { Router } from 'vue-router';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { testRouter } from '@/__tests__/support/router';
import Recovery from '@/views/Recovery.vue';

const api = mockApi();

const USER = { id: 'u1', username: 'larry', twoFactorEnabled: true };

const view = async (): Promise<{ wrapper: VueWrapper; router: Router }> => {
    const router = testRouter();
    await router.push('/recovery');
    await router.isReady();
    return { wrapper: mount(Recovery, { global: { plugins: [router] } }), router };
};

const fill = async (wrapper: VueWrapper, username: string, code: string): Promise<void> => {
    await wrapper.findAll('input')[0]?.setValue(username);
    await wrapper.findAll('input')[1]?.setValue(code);
};

const submit = async (wrapper: VueWrapper): Promise<void> => {
    await wrapper.get('form.recovery').trigger('submit');
    await flushPromises();
};

beforeEach(() => {
    clearAuth();
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

describe('Recovery', () => {
    it('will not submit without both a username and a code', async () => {
        const { wrapper } = await view();

        await fill(wrapper, 'larry', '   ');
        await submit(wrapper);

        expect(wrapper.get('.recovery__submit').attributes('disabled')).toBeDefined();
        expect(api.calls.filter((call) => call.path === '/api/auth/recover')).toHaveLength(0);
    });

    it('sends the trimmed credentials and never marks the device trusted', async () => {
        api.on('POST /api/auth/recover', { accessToken: 'token', user: USER });
        const { wrapper } = await view();

        await fill(wrapper, ' larry ', ' aaa-111 ');
        await submit(wrapper);

        expect(api.calls[0]?.body).toEqual({ username: 'larry', recoveryCode: 'aaa-111', rememberMe: false });
    });

    it('lands on setting a password, since there is none behind the session', async () => {
        api.on('POST /api/auth/recover', { accessToken: 'token', user: USER });
        const { wrapper, router } = await view();

        await fill(wrapper, 'larry', 'aaa-111');
        await submit(wrapper);

        expect(router.currentRoute.value.name).toBe('SetPassword');
    });

    it('stays put and complains when the code is not accepted', async () => {
        api.on('POST /api/auth/recover', { error: 'INVALID_RECOVERY_CODE' }, { status: 401 });
        const { wrapper, router } = await view();

        await fill(wrapper, 'larry', 'nope');
        await submit(wrapper);

        expect(wrapper.get('.form-error[role="alert"]').text()).toBe(i18n.global.t('errors.INVALID_RECOVERY_CODE'));
        expect(router.currentRoute.value.name).toBe('Recovery');
    });

    it('offers the way back to signing in', async () => {
        const { wrapper } = await view();

        expect(wrapper.get('.recovery__links a').attributes('href')).toBe('/login');
    });
});
