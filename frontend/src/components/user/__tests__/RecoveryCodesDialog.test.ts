import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import RecoveryCodesDialog from '@/components/user/RecoveryCodesDialog.vue';

const CODES = ['aaa-111', 'bbb-222', 'ccc-333'];

const open = (codes: readonly string[] = CODES): VueWrapper =>
    mount(RecoveryCodesDialog, { props: { codes }, attachTo: document.body });

/** The dialog is teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const buttons = (): HTMLElement[] => [...document.body.querySelectorAll<HTMLElement>('.dialog__footer button')];

const press = async (index: number): Promise<void> => {
    buttons()[index]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
};

const withClipboard = (writeText: () => Promise<void>): void => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
};

afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
});

describe('RecoveryCodesDialog', () => {
    it('shows every code it was issued', () => {
        open();

        expect([...document.body.querySelectorAll('.codes__item')].map((node) => node.textContent)).toEqual(CODES);
    });

    it('cannot be dismissed by a stray backdrop click, since the codes are shown once', async () => {
        const wrapper = open();

        $('.dialog').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('copies the codes one per line', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        withClipboard(writeText);
        open();

        await press(0);

        expect(writeText).toHaveBeenCalledWith(CODES.join('\n'));
    });

    it('says the codes were copied', async () => {
        withClipboard(vi.fn().mockResolvedValue(undefined));
        open();

        await press(0);

        expect(buttons()[0]?.textContent?.trim()).toBe(i18n.global.t('user.security.codes.copied'));
    });

    it('stays quiet when the browser refuses the clipboard', async () => {
        withClipboard(vi.fn().mockRejectedValue(new Error('denied')));
        open();

        await press(0);

        expect(buttons()[0]?.textContent?.trim()).toBe(i18n.global.t('user.security.codes.copy'));
    });

    it('downloads the codes as a text file', async () => {
        const anchor = document.createElement('a');
        const clicked = vi.spyOn(anchor, 'click').mockImplementation(() => {});
        vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
            tag === 'a' ? anchor : document.createElementNS('http://www.w3.org/1999/xhtml', tag),
        );
        URL.createObjectURL = vi.fn(() => 'blob:codes');
        URL.revokeObjectURL = vi.fn();
        open();

        await press(1);

        expect(clicked).toHaveBeenCalled();
        expect(anchor.download).toBe('ereuna-recovery-codes.txt');
    });

    it('closes once the codes are put away', async () => {
        const wrapper = open();

        await press(2);

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
