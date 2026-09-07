import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { testRouter } from '@/__tests__/support/router';
import PasswordForm from '@/components/user/PasswordForm.vue';

const api = mockApi();

const form = (): { wrapper: VueWrapper; router: ReturnType<typeof testRouter> } => {
    const router = testRouter();
    const wrapper = mount(PasswordForm, { global: { plugins: [router] } });
    return { wrapper, router };
};

const fill = async (wrapper: VueWrapper, current: string, next: string, confirm: string): Promise<void> => {
    const inputs = wrapper.findAll('input');
    await inputs[0]?.setValue(current);
    await inputs[1]?.setValue(next);
    await inputs[2]?.setValue(confirm);
};

const submit = async (wrapper: VueWrapper): Promise<void> => {
    await wrapper.get('form').trigger('submit');
    await flushPromises();
};

beforeEach(() => {
    api.on('PATCH /api/account/password', null, { status: 204 });
    api.on('POST /api/auth/logout', null, { status: 204 });
});

describe('PasswordForm', () => {
    it('says nothing about a field until the form is submitted', async () => {
        const { wrapper } = form();

        await fill(wrapper, '', 'short', 'other');

        expect(wrapper.find('.field__error').exists()).toBe(false);
    });

    it('refuses a new password the API would reject anyway', async () => {
        const { wrapper } = form();

        await fill(wrapper, 'old', 'short', 'short');
        await submit(wrapper);

        expect(api.calls).toHaveLength(0);
    });

    it('refuses a confirmation that does not match', async () => {
        const { wrapper } = form();

        await fill(wrapper, 'old', 'Sup3rSecret!', 'Sup3rSecret?');
        await submit(wrapper);

        expect(api.calls).toHaveLength(0);
        expect(wrapper.findAll('.field__error').length).toBeGreaterThan(0);
    });

    it('refuses to submit without the current password', async () => {
        const { wrapper } = form();

        await fill(wrapper, '', 'Sup3rSecret!', 'Sup3rSecret!');
        await submit(wrapper);

        expect(api.calls).toHaveLength(0);
    });

    it('sends both passwords under the names the API reads', async () => {
        const { wrapper } = form();

        await fill(wrapper, 'old', 'Sup3rSecret!', 'Sup3rSecret!');
        await submit(wrapper);

        expect(api.calls[0]?.body).toEqual({ currentPassword: 'old', newPassword: 'Sup3rSecret!' });
    });

    it('ends the session and sends the user back to sign in, since the API killed it', async () => {
        const { wrapper, router } = form();

        await fill(wrapper, 'old', 'Sup3rSecret!', 'Sup3rSecret!');
        await submit(wrapper);

        expect(api.calls.map((call) => call.path)).toEqual(['/api/account/password', '/api/auth/logout']);
        expect(router.currentRoute.value.name).toBe('Login');
    });

    it('shows what the API refused and keeps the session', async () => {
        api.on('PATCH /api/account/password', { error: 'INVALID_CREDENTIALS' }, { status: 401, once: true });
        const { wrapper, router } = form();

        await fill(wrapper, 'wrong', 'Sup3rSecret!', 'Sup3rSecret!');
        await submit(wrapper);

        expect(wrapper.get('.form-error[role="alert"]').text()).toBe(i18n.global.t('errors.INVALID_CREDENTIALS'));
        expect(router.currentRoute.value.name).not.toBe('Login');
    });

    it('sends one change however fast the button is pressed', async () => {
        const { wrapper } = form();

        await fill(wrapper, 'old', 'Sup3rSecret!', 'Sup3rSecret!');
        await wrapper.get('form').trigger('submit');
        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(api.calls.filter((call) => call.path === '/api/account/password')).toHaveLength(1);
    });
});
