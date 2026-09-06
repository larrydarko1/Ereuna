import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';

const open = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(ConfirmDialog, {
        props: { title: 'Delete portfolio', message: 'This cannot be undone.', ...props },
        attachTo: document.body,
    });

/** The dialog is teleported to <body>, which the wrapper does not traverse. */
const buttons = (): HTMLButtonElement[] => [
    ...document.body.querySelectorAll<HTMLButtonElement>('.dialog__footer button'),
];

const clickText = async (label: string): Promise<void> => {
    const target = buttons().find((button) => button.textContent?.trim() === label);
    target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
};

afterEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
});

describe('ConfirmDialog', () => {
    it('states what is about to happen', () => {
        open();

        expect(document.body.textContent).toContain('This cannot be undone.');
        expect(document.body.querySelector('.dialog__title')?.textContent).toBe('Delete portfolio');
    });

    it("labels its buttons in the user's language by default", () => {
        open();

        expect(buttons().map((button) => button.textContent?.trim())).toEqual([
            i18n.global.t('common.cancel'),
            i18n.global.t('common.confirm'),
        ]);
    });

    it('takes labels of its own', () => {
        open({ confirmLabel: 'Delete it', cancelLabel: 'Keep it' });

        expect(buttons().map((button) => button.textContent?.trim())).toEqual(['Keep it', 'Delete it']);
    });

    it('reports a confirmation', async () => {
        const wrapper = open({ confirmLabel: 'Delete it' });

        await clickText('Delete it');

        expect(wrapper.emitted('confirm')).toHaveLength(1);
        expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('reports a cancellation', async () => {
        const wrapper = open({ cancelLabel: 'Keep it' });

        await clickText('Keep it');

        expect(wrapper.emitted('close')).toHaveLength(1);
        expect(wrapper.emitted('confirm')).toBeUndefined();
    });

    it('says it is working, and refuses a second click, while the write is in flight', () => {
        open({ pending: true });
        const confirm = buttons()[1];

        expect(confirm?.textContent?.trim()).toBe(i18n.global.t('common.processing'));
        expect(confirm?.disabled).toBe(true);
    });

    it('shows a failure where a screen reader will announce it', () => {
        open({ error: 'That portfolio still has open positions' });
        const alert = document.body.querySelector('[role="alert"]');

        expect(alert?.textContent).toBe('That portfolio still has open positions');
    });

    it('closes on Escape, like every dialog', () => {
        const wrapper = open();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
