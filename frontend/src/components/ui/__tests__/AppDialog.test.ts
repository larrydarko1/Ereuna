import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import AppDialog from '@/components/ui/AppDialog.vue';

const open = (props: Record<string, unknown> = {}, slots: Record<string, string> = {}): VueWrapper =>
    mount(AppDialog, {
        props: { title: 'Delete portfolio', ...props },
        slots: { default: '<p>Are you sure?</p>', ...slots },
        attachTo: document.body,
    });

const press = (key: string, init: KeyboardEventInit = {}): void =>
    void document.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }));

/** The dialog is teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const click = async (selector: string): Promise<void> => {
    $(selector).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
};

const mousedown = async (selector: string): Promise<void> => {
    $(selector).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await Promise.resolve();
};

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
});

describe('AppDialog', () => {
    it('renders as a modal dialog named by its own title', () => {
        open();
        const panel = $('[role="dialog"]');

        expect(panel.getAttribute('aria-modal')).toBe('true');
        expect(panel.getAttribute('aria-labelledby')).toBe($('.dialog__title').id);
        expect($('.dialog__title').textContent).toBe('Delete portfolio');
    });

    it('renders the body it was given, and no footer until there is one', () => {
        open();

        expect(document.body.textContent).toContain('Are you sure?');
        expect(document.body.querySelector('.dialog__footer')).toBeNull();
    });

    it('renders a footer when the slot is filled', () => {
        open({}, { footer: '<button>Delete</button>' });

        expect($('.dialog__footer').textContent).toBe('Delete');
    });

    it('closes on the header button', async () => {
        const wrapper = open();

        await click('.dialog__close');

        expect(wrapper.emitted('close')).toHaveLength(1);
        expect($('.dialog__close').getAttribute('aria-label')).toBe(i18n.global.t('common.close'));
    });

    it('closes on Escape', () => {
        const wrapper = open();

        press('Escape');

        expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('closes on a click on the backdrop', async () => {
        const wrapper = open();

        await mousedown('.dialog');

        expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('does not close on a click inside the panel', async () => {
        const wrapper = open();

        await mousedown('.dialog__panel');

        expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('keeps the backdrop inert when it is not dismissible, but Escape still works', async () => {
        const wrapper = open({ dismissible: false });

        await mousedown('.dialog');
        expect(wrapper.emitted('close')).toBeUndefined();

        press('Escape');
        expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('stops the page behind it from scrolling, and lets it again on close', () => {
        const wrapper = open();
        expect(document.body.style.overflow).toBe('hidden');

        wrapper.unmount();

        expect(document.body.style.overflow).toBe('');
    });

    it('moves focus into the dialog on open', async () => {
        open({}, { footer: '<button class="go">Delete</button>' });
        await settle();

        expect(document.activeElement).toBe($('.dialog__close'));
    });

    it('returns focus where it came from on close', async () => {
        const opener = document.createElement('button');
        document.body.append(opener);
        opener.focus();

        const wrapper = open();
        await settle();
        wrapper.unmount();

        expect(document.activeElement).toBe(opener);
    });

    it.each(['sm', 'md', 'lg'] as const)('renders at %s', (size) => {
        open({ size });
        expect($('.dialog__panel').classList).toContain(`dialog__panel--${size}`);
    });

    it('keeps Tab inside — the page behind is still there and still clickable', async () => {
        open({}, { footer: '<button class="go">Delete</button>' });
        await settle();
        const last = $('.go');
        const first = $('.dialog__close');

        last.focus();
        press('Tab');
        expect(document.activeElement).toBe(first);

        first.focus();
        press('Tab', { shiftKey: true });
        expect(document.activeElement).toBe(last);
    });

    it('leaves an ordinary Tab alone', async () => {
        open({}, { footer: '<button class="go">Delete</button>' });
        await settle();
        const first = $('.dialog__close');

        first.focus();
        press('Tab');

        expect(document.activeElement).toBe(first);
    });

    it('ignores every other key', () => {
        const wrapper = open();

        press('Enter');

        expect(wrapper.emitted('close')).toBeUndefined();
    });
});
