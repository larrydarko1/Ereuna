import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import ImportDialog from '@/components/portfolio/ImportDialog.vue';

const open = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(ImportDialog, { props, attachTo: document.body });

/** The dialog is teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

/** A file input cannot be assigned, so the change carries the file itself. */
const choose = async (contents: string): Promise<void> => {
    const input = $('input[type="file"]') as HTMLInputElement;
    const file = new File([contents], 'portfolio.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
};

const submit = async (): Promise<void> => {
    $('.dialog__footer .btn--primary').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('ImportDialog', () => {
    it('will not import until a file has been read', async () => {
        const wrapper = open();

        await submit();

        expect(wrapper.emitted('submit')).toBeUndefined();
        expect($('.dialog__footer .btn--primary').hasAttribute('disabled')).toBe(true);
    });

    it('counts the trades a file holds before importing them', async () => {
        open();

        await choose(JSON.stringify({ trades: [{ action: 'buy' }, { action: 'sell' }] }));

        expect($('.import-dialog__summary').textContent?.trim()).toBe(
            i18n.global.t('portfolio.importSummary', { trades: 2 }),
        );
    });

    it('imports the trades with the settings they were traded at', async () => {
        const wrapper = open();
        const portfolio = { baseValue: 50_000, leverage: 1, defaultCommission: 0, benchmarks: [] };

        await choose(JSON.stringify({ portfolio, trades: [{ action: 'buy' }] }));
        await submit();

        expect(wrapper.emitted('submit')?.[0]).toEqual([{ trades: [{ action: 'buy' }], portfolio }]);
    });

    it('imports a bare trade log, leaving this slot to keep its own settings', async () => {
        const wrapper = open();

        await choose(JSON.stringify({ trades: [] }));
        await submit();

        expect(wrapper.emitted('submit')?.[0]).toEqual([{ trades: [] }]);
    });

    it('refuses a file that is not JSON', async () => {
        open();

        await choose('not json at all');

        expect($('.form-error[role="alert"]').textContent).toBe(i18n.global.t('portfolio.importInvalid'));
    });

    it('refuses JSON that is not an export', async () => {
        open();

        await choose(JSON.stringify({ positions: [] }));

        expect($('.form-error[role="alert"]').textContent).toBe(i18n.global.t('portfolio.importInvalid'));
    });

    it('refuses a JSON literal, which has no trades to read', async () => {
        open();

        await choose('null');

        expect($('.form-error[role="alert"]').textContent).toBe(i18n.global.t('portfolio.importInvalid'));
    });

    it('forgets the last file when a new one is chosen', async () => {
        open();

        await choose('not json');
        await choose(JSON.stringify({ trades: [{ action: 'buy' }] }));

        expect(document.body.querySelector('.form-error')).toBeNull();
        expect(document.body.querySelector('.import-dialog__summary')).not.toBeNull();
    });

    it('prefers its own complaint over the one the API sent', async () => {
        open({ error: 'Slot is not empty' });

        await choose('not json');

        expect($('.form-error[role="alert"]').textContent).toBe(i18n.global.t('portfolio.importInvalid'));
    });

    it('shows what the API refused when the file itself was fine', () => {
        open({ error: 'Slot is not empty' });

        expect($('.form-error[role="alert"]').textContent).toBe('Slot is not empty');
    });

    it('closes on cancel', async () => {
        const wrapper = open();

        $('.dialog__footer .btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
