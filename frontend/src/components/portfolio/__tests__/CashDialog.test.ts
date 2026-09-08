import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { toDateInput } from '@/utils/formatters';
import CashDialog from '@/components/portfolio/CashDialog.vue';

const open = (props: Record<string, unknown> = {}): VueWrapper => mount(CashDialog, { props, attachTo: document.body });

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

const save = async (): Promise<void> => {
    $('.dialog__footer .btn--primary').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
};

const fill = async (amount: string): Promise<void> => {
    await type('input[type="number"]', amount);
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('CashDialog', () => {
    it('starts on a deposit dated today', () => {
        open();

        expect(($('input[value="deposit"]') as HTMLInputElement).checked).toBe(true);
        expect(($('input[type="date"]') as HTMLInputElement).value).toBe(toDateInput(new Date()));
    });

    it('will not save until there is an amount to move', async () => {
        const wrapper = open();

        await save();

        expect(wrapper.emitted('submit')).toBeUndefined();
        expect($('.dialog__footer .btn--primary').hasAttribute('disabled')).toBe(true);
    });

    it('will not save a movement of nothing', async () => {
        const wrapper = open();

        await fill('0');
        await save();

        expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('submits a deposit naming no instrument, which is what the schema reads as cash', async () => {
        const wrapper = open();

        await fill('2500');
        await type('input[type="date"]', '2026-03-04');
        await save();

        expect(wrapper.emitted('submit')?.[0]).toEqual([
            { action: 'deposit', symbol: null, total: 2500, tradeDate: '2026-03-04' },
        ]);
    });

    it('submits a withdrawal when that is what was picked', async () => {
        const wrapper = open();

        ($('input[value="withdrawal"]') as HTMLInputElement).click();
        await fill('500');
        await save();

        expect((wrapper.emitted('submit')?.[0] as [{ action: string }])[0].action).toBe('withdrawal');
    });

    it('sends nothing more while a save is in flight', async () => {
        const wrapper = open({ saving: true });

        await fill('2500');
        await save();

        expect(wrapper.emitted('submit')).toBeUndefined();
        expect($('.dialog__footer .btn--primary').textContent?.trim()).toBe(i18n.global.t('common.saving'));
    });

    it('shows what the last save was refused for', () => {
        open({ error: 'Not enough cash' });

        expect($('.form-error[role="alert"]').textContent).toBe('Not enough cash');
    });

    it('closes on cancel', async () => {
        const wrapper = open();

        $('.dialog__footer .btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
