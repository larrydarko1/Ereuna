import { afterEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import TwoFactorDialog from '@/components/user/TwoFactorDialog.vue';

const api = mockApi();

const ENROLMENT = { secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Ereuna:larry?secret=JBSWY3DPEHPK3PXP' };

const open = async (): Promise<VueWrapper> => {
    const wrapper = mount(TwoFactorDialog, { attachTo: document.body });
    await flushPromises();
    return wrapper;
};

/** The dialog is teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const type = async (value: string): Promise<void> => {
    const field = $('.enrol__code') as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
};

const confirm = async (): Promise<void> => {
    $('.dialog__footer .btn--primary').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('TwoFactorDialog', () => {
    it('spins while the pending secret is being written', () => {
        api.on('POST /api/account/2fa', ENROLMENT);

        expect(mount(TwoFactorDialog).findComponent({ name: 'AppSpinner' }).exists()).toBe(true);
    });

    it('shows the secret as a code to scan and as text to type', async () => {
        api.on('POST /api/account/2fa', ENROLMENT);

        await open();

        expect($('.enrol__secret').textContent).toBe(ENROLMENT.secret);
        expect(document.body.querySelector('.enrol__qr svg')).not.toBeNull();
    });

    it('will not confirm until a code has been typed', async () => {
        api.on('POST /api/account/2fa', ENROLMENT);
        const wrapper = await open();

        await confirm();

        expect(api.calls).toHaveLength(1);
        expect(wrapper.emitted('enrolled')).toBeUndefined();
    });

    it('confirms with the trimmed code and hands the recovery codes up', async () => {
        api.on('POST /api/account/2fa', ENROLMENT);
        api.on('POST /api/account/2fa/confirm', { recoveryCodes: ['aaa-111'] });
        const wrapper = await open();

        await type(' 123456 ');
        await confirm();

        expect(api.last().body).toEqual({ code: '123456' });
        expect(wrapper.emitted('enrolled')?.[0]).toEqual([['aaa-111']]);
    });

    it('shows what the API refused and stays open', async () => {
        api.on('POST /api/account/2fa', ENROLMENT);
        api.on('POST /api/account/2fa/confirm', { error: 'INVALID_TWO_FA_CODE' }, { status: 400 });
        const wrapper = await open();

        await type('000000');
        await confirm();

        expect($('.enrol .form-error').textContent).toBe(i18n.global.t('errors.INVALID_TWO_FA_CODE'));
        expect(wrapper.emitted('enrolled')).toBeUndefined();
    });

    it('offers no form at all when the secret could not be written', async () => {
        api.on('POST /api/account/2fa', { error: 'INTERNAL' }, { status: 500 });

        await open();

        expect(document.body.querySelector('.enrol')).toBeNull();
        expect($('.form-error[role="alert"]').textContent).toBe(i18n.global.t('errors.INTERNAL'));
    });

    it('closes on cancel', async () => {
        api.on('POST /api/account/2fa', ENROLMENT);
        const wrapper = await open();

        $('.dialog__footer .btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
