import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import PromptDialog from '@/components/ui/PromptDialog.vue';

const open = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(PromptDialog, {
        props: { title: 'New watchlist', label: 'Name', ...props },
        attachTo: document.body,
    });

/** The dialog is teleported to <body>, which the wrapper does not traverse. */
const $ = <T extends HTMLElement>(selector: string): T => {
    const element = document.body.querySelector<T>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const type = async (value: string): Promise<void> => {
    const input = $<HTMLInputElement>('.prompt__input');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await Promise.resolve();
};

const submitButton = (): HTMLButtonElement => $<HTMLButtonElement>('.prompt__submit');

afterEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
});

describe('PromptDialog', () => {
    it('ties the label to the input', () => {
        open();

        expect($('.prompt__label').getAttribute('for')).toBe($('.prompt__input').id);
    });

    it('opens empty, with the submit refused', () => {
        open();

        expect($<HTMLInputElement>('.prompt__input').value).toBe('');
        expect(submitButton().disabled).toBe(true);
    });

    it('opens on the value it was given — a rename starts from the current name', () => {
        open({ initial: 'Tech' });

        expect($<HTMLInputElement>('.prompt__input').value).toBe('Tech');
        expect(submitButton().disabled).toBe(false);
    });

    it('counts what has been typed against the limit', async () => {
        open({ maxLength: 20 });

        await type('Tech');

        expect($('.prompt__count').textContent).toBe('4/20');
        expect($('.prompt__input').getAttribute('maxlength')).toBe('20');
    });

    it('submits the trimmed value', async () => {
        const wrapper = open();
        await type('  Tech  ');

        submitButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(wrapper.emitted('submit')).toEqual([['Tech']]);
    });

    it('submits on Enter in the form', async () => {
        const wrapper = open({ initial: 'Tech' });

        $('.prompt').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await Promise.resolve();

        expect(wrapper.emitted('submit')).toEqual([['Tech']]);
    });

    it('refuses to submit whitespace', async () => {
        const wrapper = open();
        await type('   ');

        $('.prompt').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        expect(submitButton().disabled).toBe(true);
        expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('refuses a second submit while the first is in flight', () => {
        open({ initial: 'Tech', pending: true });

        expect(submitButton().disabled).toBe(true);
    });

    it('shows a failure where a screen reader will announce it', () => {
        open({ error: 'That name is taken' });

        expect($('[role="alert"]').textContent).toBe('That name is taken');
    });

    it('closes on cancel', async () => {
        const wrapper = open();

        $('.prompt__cancel').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
