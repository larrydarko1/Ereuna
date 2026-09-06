import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import BenchmarksDialog from '@/components/portfolio/BenchmarksDialog.vue';

const open = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(BenchmarksDialog, { props: { current: ['SPY'], ...props }, attachTo: document.body });

/** The dialog is teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const type = async (value: string): Promise<void> => {
    const field = $('.benchmarks-dialog__add input') as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
};

const add = async (): Promise<void> => {
    $('.benchmarks-dialog__add').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
};

const listed = (): string[] =>
    [...document.body.querySelectorAll('.benchmarks-dialog__item span')].map((node) => node.textContent ?? '');

afterEach(() => {
    document.body.innerHTML = '';
});

describe('BenchmarksDialog', () => {
    it('starts on the benchmarks already tracked', () => {
        open({ current: ['SPY', 'QQQ'] });

        expect(listed()).toEqual(['SPY', 'QQQ']);
    });

    it('says so when nothing is tracked yet', () => {
        open({ current: [] });

        expect($('.form-hint').textContent).toBe(i18n.global.t('portfolio.noBenchmarks'));
    });

    it('adds a symbol in upper case, whatever was typed', async () => {
        open({ current: [] });

        await type(' qqq ');
        await add();

        expect(listed()).toEqual(['QQQ']);
    });

    it('empties the field once a symbol is added', async () => {
        open({ current: [] });

        await type('qqq');
        await add();

        expect(($('.benchmarks-dialog__add input') as HTMLInputElement).value).toBe('');
    });

    it('refuses a symbol already on the list', async () => {
        open({ current: ['SPY'] });

        await type('spy');
        await add();

        expect(listed()).toEqual(['SPY']);
        expect($('.benchmarks-dialog__add button').hasAttribute('disabled')).toBe(true);
    });

    it('refuses a blank symbol', async () => {
        open({ current: [] });

        await type('   ');
        await add();

        expect(listed()).toEqual([]);
    });

    it('stops at the cap the API enforces', async () => {
        open({ current: ['SPY', 'QQQ', 'DIA', 'IWM', 'EFA'] });

        expect(($('.benchmarks-dialog__add input') as HTMLInputElement).disabled).toBe(true);

        await type('EEM');
        await add();
        expect(listed()).toHaveLength(5);
    });

    it('removes a symbol from the list', async () => {
        open({ current: ['SPY', 'QQQ'] });

        $('.benchmarks-dialog__item .btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(listed()).toEqual(['QQQ']);
    });

    it('saves the list as edited, not as it arrived', async () => {
        const wrapper = open({ current: ['SPY'] });

        await type('qqq');
        await add();
        $('.dialog__footer .btn--primary').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('save')?.[0]).toEqual([['SPY', 'QQQ']]);
    });

    it('shows what the last save was refused for, and locks while saving', () => {
        open({ error: 'Unknown symbol', saving: true });

        expect($('.form-error[role="alert"]').textContent).toBe('Unknown symbol');
        expect($('.dialog__footer .btn--primary').hasAttribute('disabled')).toBe(true);
    });

    it('closes on cancel', async () => {
        const wrapper = open();

        $('.dialog__footer .btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
