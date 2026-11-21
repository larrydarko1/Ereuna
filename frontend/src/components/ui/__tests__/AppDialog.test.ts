import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import { getElement } from '@/__tests__/support/dom';
import AppDialog from '@/components/ui/AppDialog.vue';
import { i18n } from '@/i18n';

const open = (props: Record<string, unknown> = {}, slots: Record<string, string> = {}): VueWrapper =>
    mount(AppDialog, {
        props: { title: 'Delete portfolio', ...props },
        slots: { default: '<p>Are you sure?</p>', ...slots },
        attachTo: document.body,
    });

const press = (key: string, init: KeyboardEventInit = {}): void =>
    void document.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }));

const click = async (selector: string): Promise<void> => {
    getElement(selector).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
};

const mousedown = async (selector: string): Promise<void> => {
    getElement(selector).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
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
        const panel = getElement('[role="dialog"]');

        expect(panel.getAttribute('aria-modal')).toBe('true');
        expect(panel.getAttribute('aria-labelledby')).toBe(getElement('.dialog__title').id);
        expect(getElement('.dialog__title').textContent).toBe('Delete portfolio');
    });

    it('renders the body it was given, and no footer until there is one', () => {
        open();

        expect(document.body.textContent).toContain('Are you sure?');
        expect(document.body.querySelector('.dialog__footer')).toBeNull();
    });

    it('renders a footer when the slot is filled', () => {
        open({}, { footer: '<button>Delete</button>' });

        expect(getElement('.dialog__footer').textContent).toBe('Delete');
    });

    it('closes on the header button', async () => {
        const wrapper = open();

        await click('.dialog__close');

        expect(wrapper.emitted('close')).toHaveLength(1);
        expect(getElement('.dialog__close').getAttribute('aria-label')).toBe(i18n.global.t('common.close'));
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

    it('keeps the backdrop inert when asked to, but Escape still works', async () => {
        const wrapper = open({ inertBackdrop: true });

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

        expect(document.activeElement).toBe(getElement('.dialog__close'));
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
        expect(getElement('.dialog__panel').classList).toContain(`dialog__panel--${size}`);
    });

    it('keeps Tab inside — the page behind is still there and still clickable', async () => {
        open({}, { footer: '<button class="go">Delete</button>' });
        await settle();
        const last = getElement('.go');
        const first = getElement('.dialog__close');

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
        const first = getElement('.dialog__close');

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
