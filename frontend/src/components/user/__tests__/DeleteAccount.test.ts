import { describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { testRouter } from '@/__tests__/support/router';
import DeleteAccount from '@/components/user/DeleteAccount.vue';

const api = mockApi();

const panel = (): { wrapper: VueWrapper; router: ReturnType<typeof testRouter> } => {
    const router = testRouter();
    const wrapper = mount(DeleteAccount, { global: { plugins: [router] }, attachTo: document.body });
    return { wrapper, router };
};

/** The confirmation is teleported to <body>, which the wrapper does not traverse. */
const confirm = async (): Promise<void> => {
    const buttons = [...document.body.querySelectorAll<HTMLElement>('.dialog__footer button')];
    buttons[buttons.length - 1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
};

const arm = async (wrapper: VueWrapper): Promise<void> => {
    await wrapper.get('input').setValue('secret');
    await wrapper.get('.btn--danger').trigger('click');
};

describe('DeleteAccount', () => {
    it('warns before it offers the button at all', () => {
        const { wrapper } = panel();

        expect(wrapper.get('.delete__lead').text()).toContain(i18n.global.t('user.delete.warning'));
    });

    it('will not arm without the current password', () => {
        const { wrapper } = panel();

        expect(wrapper.get('.btn--danger').attributes('disabled')).toBeDefined();
    });

    it('asks a second time rather than deleting on the first press', async () => {
        const { wrapper } = panel();

        await arm(wrapper);

        expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
        expect(api.calls).toHaveLength(0);
        wrapper.unmount();
    });

    it('deletes the account and sends the user to sign in', async () => {
        api.on('DELETE /api/account', null, { status: 204 });
        const { wrapper, router } = panel();

        await arm(wrapper);
        await confirm();

        expect(api.last().body).toEqual({ password: 'secret' });
        expect(router.currentRoute.value.name).toBe('Login');
        wrapper.unmount();
    });

    it('closes the confirmation and explains a refusal', async () => {
        api.on('DELETE /api/account', { error: 'INVALID_CREDENTIALS' }, { status: 401 });
        const { wrapper, router } = panel();

        await arm(wrapper);
        await confirm();

        expect(wrapper.get('.form-error[role="alert"]').text()).toBe(i18n.global.t('errors.INVALID_CREDENTIALS'));
        expect(router.currentRoute.value.name).not.toBe('Login');
        wrapper.unmount();
    });
});
