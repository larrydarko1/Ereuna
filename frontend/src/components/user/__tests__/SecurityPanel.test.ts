import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { dismiss, useNotifications } from '@/composables/ui/useNotifications';
import SecurityPanel from '@/components/user/SecurityPanel.vue';

const api = mockApi();

const { toasts } = useNotifications();

const panel = async (enabled: boolean): Promise<VueWrapper> => {
    const wrapper = mount(SecurityPanel, { props: { enabled }, attachTo: document.body });
    await flushPromises();
    return wrapper;
};

/** Dialogs are teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} on the page`);
    return element;
};

const type = async (selector: string, value: string): Promise<void> => {
    const field = $(selector) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
};

const confirmDialog = async (): Promise<void> => {
    $('.dialog__footer .btn--danger, .dialog__footer .btn--primary').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
    );
    await flushPromises();
};

beforeEach(() => {
    for (const toast of [...toasts.value]) dismiss(toast.id);
    api.on('GET /api/account/recovery-codes', { remaining: 7 });
});

afterEach(() => {
    document.body.innerHTML = '';
});

describe('SecurityPanel', () => {
    it('offers to enable the second factor while it is off', async () => {
        const wrapper = await panel(false);

        expect(wrapper.get('.security__status').text()).toBe(i18n.global.t('user.security.statusOff'));
        expect(wrapper.get('.btn--primary').text()).toBe(i18n.global.t('user.security.enable'));
    });

    it('offers no recovery codes while there is no authenticator to recover from', async () => {
        const wrapper = await panel(false);

        expect(wrapper.findAll('.setting')).toHaveLength(1);
        expect(api.calls).toHaveLength(0);
    });

    it('counts the remaining recovery codes once the factor is on', async () => {
        const wrapper = await panel(true);

        expect(wrapper.findAll('.setting')).toHaveLength(2);
        expect(wrapper.get('.form-hint').text()).toBe(i18n.global.t('user.security.codes.remaining', { count: 7 }));
    });

    it('asks for both factors to drop the second one', async () => {
        const wrapper = await panel(true);

        await wrapper.get('.btn--danger').trigger('click');

        expect(document.body.querySelectorAll('.dialog input')).toHaveLength(2);
    });

    it('drops the factor and reports it upward', async () => {
        api.on('DELETE /api/account/2fa', null, { status: 204 });
        const wrapper = await panel(true);

        await wrapper.get('.btn--danger').trigger('click');
        await type('input[type="password"]', 'secret');
        await type('.reauth__code', '123456');
        await confirmDialog();

        expect(wrapper.emitted('changed')?.[0]).toEqual([false]);
        expect(document.body.querySelector('[role="dialog"]')).toBeNull();
        expect(toasts.value[0]?.tone).toBe('success');
    });

    it('keeps the dialog open and explains a refusal', async () => {
        api.on('DELETE /api/account/2fa', { error: 'INVALID_TWO_FA_CODE' }, { status: 400 });
        const wrapper = await panel(true);

        await wrapper.get('.btn--danger').trigger('click');
        await type('input[type="password"]', 'secret');
        await type('.reauth__code', '000000');
        await confirmDialog();

        expect($('.reauth .form-error').textContent).toBe(i18n.global.t('errors.INVALID_TWO_FA_CODE'));
        expect(wrapper.emitted('changed')).toBeUndefined();
    });

    it('asks for the password alone to reissue codes', async () => {
        const wrapper = await panel(true);

        await wrapper.findAll('.btn')[1]?.trigger('click');

        expect(document.body.querySelectorAll('.dialog input')).toHaveLength(1);
    });

    it('shows the reissued codes and re-counts them', async () => {
        api.on('POST /api/account/recovery-codes', { recoveryCodes: ['aaa-111', 'bbb-222'] });
        const wrapper = await panel(true);

        await wrapper.findAll('.btn')[1]?.trigger('click');
        await type('input[type="password"]', 'secret');
        await confirmDialog();

        expect(document.body.querySelectorAll('.codes__item')).toHaveLength(2);
        expect(api.calls.filter((call) => call.method === 'GET')).toHaveLength(2);
    });

    it('shows the codes issued by an enrolment and says the factor is on', async () => {
        api.on('POST /api/account/2fa', { secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Ereuna:larry' });
        api.on('POST /api/account/2fa/confirm', { recoveryCodes: ['aaa-111'] });
        const wrapper = await panel(false);

        // The enrolment dialog is loaded on demand, so it arrives a tick late
        await wrapper.get('.btn--primary').trigger('click');
        await vi.waitFor(() => expect(document.body.querySelector('.enrol__code')).not.toBeNull());
        await type('.enrol__code', '123456');
        await confirmDialog();

        expect(wrapper.emitted('changed')?.[0]).toEqual([true]);
        expect(document.body.querySelectorAll('.codes__item')).toHaveLength(1);
    });
});
