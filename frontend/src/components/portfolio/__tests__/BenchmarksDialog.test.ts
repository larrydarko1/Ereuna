import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import { getElement, query } from '@/__tests__/support/dom';
import BenchmarksDialog from '@/components/portfolio/BenchmarksDialog.vue';
import { i18n } from '@/i18n';

const open = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(BenchmarksDialog, { props: { current: ['SPY'], ...props }, attachTo: document.body });

const type = async (value: string): Promise<void> => {
    const field = query('.benchmarks-dialog__add input', HTMLInputElement);
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
};

const add = async (): Promise<void> => {
    getElement('.benchmarks-dialog__add').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
};

const listed = (): string[] =>
    [...document.body.querySelectorAll('.benchmarks-dialog__item span')].map((node) => node.textContent);

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

        expect(getElement('.form-hint').textContent).toBe(i18n.global.t('portfolio.noBenchmarks'));
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

        expect(query('.benchmarks-dialog__add input', HTMLInputElement).value).toBe('');
    });

    it('refuses a symbol already on the list', async () => {
        open({ current: ['SPY'] });

        await type('spy');
        await add();

        expect(listed()).toEqual(['SPY']);
        expect(getElement('.benchmarks-dialog__add button').hasAttribute('disabled')).toBe(true);
    });

    it('refuses a blank symbol', async () => {
        open({ current: [] });

        await type('   ');
        await add();

        expect(listed()).toEqual([]);
    });

    it('stops at the cap the API enforces', async () => {
        open({ current: ['SPY', 'QQQ', 'DIA', 'IWM', 'EFA'] });

        expect(query('.benchmarks-dialog__add input', HTMLInputElement).disabled).toBe(true);

        await type('EEM');
        await add();
        expect(listed()).toHaveLength(5);
    });

    it('removes a symbol from the list', async () => {
        open({ current: ['SPY', 'QQQ'] });

        getElement('.benchmarks-dialog__item .btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(listed()).toEqual(['QQQ']);
    });

    it('saves the list as edited, not as it arrived', async () => {
        const wrapper = open({ current: ['SPY'] });

        await type('qqq');
        await add();
        getElement('.dialog__footer .btn--primary').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('save')?.[0]).toEqual([['SPY', 'QQQ']]);
    });

    it('shows what the last save was refused for, and locks while saving', () => {
        open({ error: 'Unknown symbol', saving: true });

        expect(getElement('.form-error[role="alert"]').textContent).toBe('Unknown symbol');
        expect(getElement('.dialog__footer .btn--primary').hasAttribute('disabled')).toBe(true);
    });

    it('closes on cancel', async () => {
        const wrapper = open();

        getElement('.dialog__footer .btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
