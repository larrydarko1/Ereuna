import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { dismiss, useNotifications } from '@/composables/ui/useNotifications';
import UsernameForm from '@/components/user/UsernameForm.vue';

const api = mockApi();

const { toasts } = useNotifications();

const form = (): VueWrapper => mount(UsernameForm, { props: { username: 'larry' } });

const fill = async (wrapper: VueWrapper, username: string, password: string): Promise<void> => {
    await wrapper.findAll('input')[0]?.setValue(username);
    await wrapper.findAll('input')[1]?.setValue(password);
};

const submit = async (wrapper: VueWrapper): Promise<void> => {
    await wrapper.get('form').trigger('submit');
    await flushPromises();
};

beforeEach(() => {
    for (const toast of [...toasts.value]) dismiss(toast.id);
});

describe('UsernameForm', () => {
    it('names the username in use', () => {
        expect(form().get('.form-hint').text()).toBe(i18n.global.t('user.username.current', { username: 'larry' }));
    });

    it('says nothing about a field until the form is submitted', async () => {
        const wrapper = form();

        await fill(wrapper, '', 'secret');

        expect(wrapper.find('.field__error').exists()).toBe(false);
    });

    it('refuses a name the API would reject anyway', async () => {
        const wrapper = form();

        await fill(wrapper, 'a', 'secret');
        await submit(wrapper);

        expect(api.calls).toHaveLength(0);
    });

    it('refuses the name already in use', async () => {
        const wrapper = form();

        await fill(wrapper, 'larry', 'secret');
        await submit(wrapper);

        expect(api.calls).toHaveLength(0);
        expect(wrapper.text()).toContain(i18n.global.t('user.username.sameAsCurrent'));
    });

    it('refuses to submit without the current password', async () => {
        const wrapper = form();

        await fill(wrapper, 'newname', '');
        await submit(wrapper);

        expect(api.calls).toHaveLength(0);
    });

    it('sends the trimmed name with the password', async () => {
        api.on('PATCH /api/account/username', { id: '1', username: 'newname', twoFactorEnabled: false });
        const wrapper = form();

        await fill(wrapper, '  newname  ', 'secret');
        await submit(wrapper);

        expect(api.last().body).toEqual({ password: 'secret', username: 'newname' });
    });

    it('reports the renamed account upward and confirms it', async () => {
        const user = { id: '1', username: 'newname', twoFactorEnabled: false };
        api.on('PATCH /api/account/username', user);
        const wrapper = form();

        await fill(wrapper, 'newname', 'secret');
        await submit(wrapper);

        expect(wrapper.emitted('renamed')?.[0]).toEqual([user]);
        expect(toasts.value[0]?.tone).toBe('success');
    });

    it('empties the form once the rename lands', async () => {
        api.on('PATCH /api/account/username', { id: '1', username: 'newname', twoFactorEnabled: false });
        const wrapper = form();

        await fill(wrapper, 'newname', 'secret');
        await submit(wrapper);

        expect((wrapper.findAll('input')[0]?.element as HTMLInputElement).value).toBe('');
        expect((wrapper.findAll('input')[1]?.element as HTMLInputElement).value).toBe('');
    });

    it('shows what the API refused', async () => {
        api.on('PATCH /api/account/username', { error: 'USERNAME_TAKEN' }, { status: 409 });
        const wrapper = form();

        await fill(wrapper, 'newname', 'secret');
        await submit(wrapper);

        expect(wrapper.get('.form-error[role="alert"]').text()).toBe(i18n.global.t('errors.USERNAME_TAKEN'));
        expect(wrapper.emitted('renamed')).toBeUndefined();
    });

    it('locks the button while the rename is in flight', async () => {
        api.on('PATCH /api/account/username', { id: '1', username: 'newname', twoFactorEnabled: false });
        const wrapper = form();

        await fill(wrapper, 'newname', 'secret');
        await wrapper.get('form').trigger('submit');

        expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
        await flushPromises();
    });

    it('sends one rename however fast the button is pressed', async () => {
        api.on('PATCH /api/account/username', { id: '1', username: 'newname', twoFactorEnabled: false });
        const wrapper = form();

        await fill(wrapper, 'newname', 'secret');
        await wrapper.get('form').trigger('submit');
        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(api.calls).toHaveLength(1);
    });
});
