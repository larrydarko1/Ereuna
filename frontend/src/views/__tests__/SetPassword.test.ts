import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { Router } from 'vue-router';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { testRouter } from '@/__tests__/support/router';
import SetPassword from '@/views/SetPassword.vue';

const api = mockApi();

const view = async (): Promise<{ wrapper: VueWrapper; router: Router }> => {
    const router = testRouter();
    await router.push('/set-password');
    await router.isReady();
    return { wrapper: mount(SetPassword, { global: { plugins: [router] } }), router };
};

const fill = async (wrapper: VueWrapper, next: string, confirmation = next): Promise<void> => {
    await wrapper.findAll('input')[0]?.setValue(next);
    await wrapper.findAll('input')[1]?.setValue(confirmation);
};

const submit = async (wrapper: VueWrapper): Promise<void> => {
    await wrapper.get('form.set-password').trigger('submit');
    await flushPromises();
};

beforeEach(() => {
    clearAuth();
    api.on('POST /api/account/recovery-password', null, { status: 204 });
    api.on('POST /api/auth/logout', null, { status: 204 });
});

describe('SetPassword', () => {
    it('says nothing about a field until the form is submitted', async () => {
        const { wrapper } = await view();

        await fill(wrapper, 'short', 'other');

        expect(wrapper.findAll('.field__error')).toHaveLength(0);
    });

    it('refuses a password the API would reject anyway', async () => {
        const { wrapper } = await view();

        await fill(wrapper, 'short');
        await submit(wrapper);

        expect(api.calls).toHaveLength(0);
        expect(wrapper.findAll('.field__error').length).toBeGreaterThan(0);
    });

    it('refuses a confirmation that does not match', async () => {
        const { wrapper } = await view();

        await fill(wrapper, 'Sup3rSecret!', 'Sup3rSecret?');
        await submit(wrapper);

        expect(api.calls).toHaveLength(0);
    });

    it('sets the password, ends the dead session and sends the user back to sign in', async () => {
        const { wrapper, router } = await view();

        await fill(wrapper, 'Sup3rSecret!');
        await submit(wrapper);

        expect(api.calls.map((call) => call.path)).toEqual(['/api/account/recovery-password', '/api/auth/logout']);
        expect(api.calls[0]?.body).toEqual({ newPassword: 'Sup3rSecret!' });
        expect(router.currentRoute.value.name).toBe('Login');
    });

    it('stays put and explains a refusal', async () => {
        api.on('POST /api/account/recovery-password', { error: 'INTERNAL' }, { status: 500, once: true });
        const { wrapper, router } = await view();

        await fill(wrapper, 'Sup3rSecret!');
        await submit(wrapper);

        expect(wrapper.get('.form-error[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
        expect(router.currentRoute.value.name).not.toBe('Login');
    });
});
