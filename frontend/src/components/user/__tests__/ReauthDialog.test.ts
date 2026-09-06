import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import ReauthDialog from '@/components/user/ReauthDialog.vue';

const open = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(ReauthDialog, {
        props: { title: 'Disable 2FA', message: 'Confirm it is you', confirmLabel: 'Disable', ...props },
        attachTo: document.body,
    });

/** The dialog is teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const type = async (selector: string, value: string): Promise<void> => {
    const field = $(selector) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
};

const submit = async (): Promise<void> => {
    $('.dialog__footer .btn--primary, .dialog__footer .btn--danger').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
    );
    await Promise.resolve();
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('ReauthDialog', () => {
    it('says what it is asking for', () => {
        open();

        expect($('.dialog__title').textContent).toBe('Disable 2FA');
        expect($('.reauth__message').textContent).toBe('Confirm it is you');
    });

    it('asks for nothing it was not told to ask for', () => {
        open();

        expect(document.body.querySelectorAll('input')).toHaveLength(0);
    });

    it('asks for the password alone when that is the whole challenge', () => {
        open({ needsPassword: true });

        expect(document.body.querySelectorAll('input')).toHaveLength(1);
        expect(document.body.querySelector('.reauth__code')).toBeNull();
    });

    it('asks for both factors when both are needed', () => {
        open({ needsPassword: true, needsCode: true });

        expect(document.body.querySelectorAll('input')).toHaveLength(2);
    });

    it('will not submit until every field it asked for is filled', async () => {
        const wrapper = open({ needsPassword: true, needsCode: true });

        await type('input[type="password"]', 'secret');

        expect($('.dialog__footer .btn--danger, .dialog__footer .btn--primary').hasAttribute('disabled')).toBe(true);
        expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('submits the credentials, trimming the code', async () => {
        const wrapper = open({ needsPassword: true, needsCode: true });

        await type('input[type="password"]', 'secret');
        await type('.reauth__code', ' 123456 ');
        await submit();

        expect(wrapper.emitted('submit')?.[0]).toEqual([{ password: 'secret', code: '123456' }]);
    });

    it('treats a code of only spaces as unfilled', async () => {
        const wrapper = open({ needsCode: true });

        await type('.reauth__code', '   ');
        await submit();

        expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('submits on the form as well as on the button', async () => {
        const wrapper = open({ needsPassword: true });

        await type('input[type="password"]', 'secret');
        $('.reauth').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await Promise.resolve();

        expect(wrapper.emitted('submit')).toHaveLength(1);
    });

    it('sends nothing more while a submission is in flight', async () => {
        const wrapper = open({ needsPassword: true, pending: true });

        await type('input[type="password"]', 'secret');
        await submit();

        expect(wrapper.emitted('submit')).toBeUndefined();
        expect($('.dialog__footer .btn--primary').textContent?.trim()).toBe(i18n.global.t('common.processing'));
    });

    it('shows what the last attempt was refused for', () => {
        open({ error: 'Wrong password' });

        expect($('.form-error[role="alert"]').textContent).toBe('Wrong password');
    });

    it('marks the action dangerous when it destroys something', () => {
        open({ danger: true });

        expect(document.body.querySelector('.dialog__footer .btn--danger')).not.toBeNull();
    });

    it('closes on cancel', async () => {
        const wrapper = open();

        $('.dialog__footer .btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
