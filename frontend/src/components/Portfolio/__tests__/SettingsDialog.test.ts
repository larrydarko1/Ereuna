import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import SettingsDialog from '@/components/portfolio/SettingsDialog.vue';

const SUMMARY = { baseValue: 100_000, leverage: 2, defaultCommission: 1 };

const open = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(SettingsDialog, { props: { summary: SUMMARY, ...props }, attachTo: document.body });

/** The dialog is teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const rows = (): HTMLElement[] => [...document.body.querySelectorAll<HTMLElement>('.settings-dialog__row')];

const edit = async (row: number, value: string): Promise<void> => {
    const field = rows()[row]?.querySelector('input') as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
};

const save = async (row: number): Promise<void> => {
    rows()
        [row]?.querySelector('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('SettingsDialog', () => {
    it('starts on the settings the portfolio already has', () => {
        open();

        expect(rows().map((row) => (row.querySelector('input') as HTMLInputElement).value)).toEqual([
            '100000',
            '2',
            '1',
        ]);
    });

    it('saves each setting on its own, so one refusal does not lose the others', async () => {
        const wrapper = open();

        await edit(0, '250000');
        await save(0);

        expect(wrapper.emitted('save-base-value')?.[0]).toEqual([250_000]);
        expect(wrapper.emitted('save-leverage')).toBeUndefined();
    });

    it('saves the leverage as a number, not as the text that was typed', async () => {
        const wrapper = open();

        await edit(1, '3.5');
        await save(1);

        expect(wrapper.emitted('save-leverage')?.[0]).toEqual([3.5]);
    });

    it('saves the commission', async () => {
        const wrapper = open();

        await edit(2, '4.95');
        await save(2);

        expect(wrapper.emitted('save-commission')?.[0]).toEqual([4.95]);
    });

    it('holds the leverage field to the ceiling the API enforces', () => {
        open();

        expect(rows()[1]?.querySelector('input')?.getAttribute('max')).toBe('10');
    });

    it('locks every save while one is in flight', () => {
        open({ saving: true });

        expect(document.body.querySelectorAll('.settings-dialog__row button[disabled]')).toHaveLength(3);
    });

    it('shows what the last save was refused for', () => {
        open({ error: 'Leverage too high' });

        expect($('.form-error[role="alert"]').textContent).toBe('Leverage too high');
    });

    it('closes on the dialog close', async () => {
        const wrapper = open();

        $('.dialog__close').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
