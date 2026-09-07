import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { Router } from 'vue-router';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { testRouter } from '@/__tests__/support/router';
import SignUp from '@/views/SignUp.vue';

const api = mockApi();

const USER = { id: 'u1', username: 'larry', twoFactorEnabled: false };

const view = async (): Promise<{ wrapper: VueWrapper; router: Router }> => {
    const router = testRouter();
    await router.push('/signup');
    await router.isReady();
    return { wrapper: mount(SignUp, { global: { plugins: [router] } }), router };
};

const fill = async (
    wrapper: VueWrapper,
    username: string,
    password: string,
    confirmation = password,
): Promise<void> => {
    const inputs = wrapper.findAll('input');
    await inputs[0]?.setValue(username);
    await inputs[1]?.setValue(password);
    await inputs[2]?.setValue(confirmation);
};

const submit = async (wrapper: VueWrapper): Promise<void> => {
    await wrapper.get('form.signup').trigger('submit');
    await flushPromises();
};

beforeEach(() => {
    clearAuth();
});

describe('SignUp', () => {
    it('says nothing about a field until the form is submitted', async () => {
        const { wrapper } = await view();

        await fill(wrapper, 'a', 'short', 'other');

        expect(wrapper.findAll('.field__error')).toHaveLength(0);
    });

    it('refuses a username or password the API would reject anyway', async () => {
        const { wrapper } = await view();

        await fill(wrapper, 'a', 'short');
        await submit(wrapper);

        expect(api.calls).toHaveLength(0);
        expect(wrapper.findAll('.field__error').length).toBeGreaterThan(0);
    });

    it('refuses a confirmation that does not match', async () => {
        const { wrapper } = await view();

        await fill(wrapper, 'larry', 'Sup3rSecret!', 'Sup3rSecret?');
        await submit(wrapper);

        expect(api.calls).toHaveLength(0);
    });

    it('registers the trimmed username and enters the app', async () => {
        api.on('POST /api/auth/register', { accessToken: 'token', user: USER });
        const { wrapper, router } = await view();

        await fill(wrapper, '  larry  ', 'Sup3rSecret!');
        await submit(wrapper);

        expect(api.last().body).toEqual({ username: 'larry', password: 'Sup3rSecret!' });
        expect(router.currentRoute.value.name).toBe('Dashboard');
    });

    it('stays put and explains a refusal', async () => {
        api.on('POST /api/auth/register', { error: 'USERNAME_TAKEN' }, { status: 409 });
        const { wrapper, router } = await view();

        await fill(wrapper, 'larry', 'Sup3rSecret!');
        await submit(wrapper);

        expect(wrapper.get('.form-error[role="alert"]').text()).toBe(i18n.global.t('errors.USERNAME_TAKEN'));
        expect(router.currentRoute.value.name).toBe('SignUp');
    });

    it('offers the way back to signing in', async () => {
        const { wrapper } = await view();

        expect(wrapper.get('.signup__links a').attributes('href')).toBe('/login');
    });
});
