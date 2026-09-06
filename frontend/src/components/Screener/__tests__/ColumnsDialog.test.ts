import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { COLUMNS } from '@/constants/screener';
import ColumnsDialog from '@/components/screener/ColumnsDialog.vue';

const open = (columns: readonly string[]): VueWrapper =>
    mount(ColumnsDialog, { props: { columns }, attachTo: document.body });

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

const FIRST = COLUMNS[0]?.path ?? '';

afterEach(() => {
    document.body.innerHTML = '';
});

describe('ColumnsDialog', () => {
    it('offers every column the catalogue knows, chosen ones and the rest', () => {
        open([FIRST]);

        expect(document.body.querySelectorAll('.reorderable__row')).toHaveLength(COLUMNS.length);
        expect(document.body.querySelectorAll('.reorderable__label--muted')).toHaveLength(COLUMNS.length - 1);
    });

    it('saves a column added from the hidden list, in the order it was added', async () => {
        const wrapper = open([FIRST]);

        await click('.reorderable__label--muted + .reorderable__button');
        await click('.columns-dialog__button--primary');

        expect(wrapper.emitted('save')?.[0]).toEqual([[FIRST, COLUMNS[1]?.path]]);
    });

    it('starts on the columns already shown', async () => {
        const wrapper = open([FIRST]);

        await click('.columns-dialog__button--primary');

        expect(wrapper.emitted('save')?.[0]).toEqual([[FIRST]]);
    });

    it('refuses to save a table with no columns in it', async () => {
        const wrapper = open([]);

        await click('.columns-dialog__button--primary');

        expect(wrapper.emitted('save')).toBeUndefined();
        expect($('[role="alert"]').textContent).toBe(i18n.global.t('screener.errorNoColumns'));
    });

    it('closes on cancel without saving', async () => {
        const wrapper = open([FIRST]);

        await click('.columns-dialog__button');

        expect(wrapper.emitted('close')).toHaveLength(1);
        expect(wrapper.emitted('save')).toBeUndefined();
    });

    it('leaves the caller list untouched while it is being edited', () => {
        const columns = [FIRST];

        open(columns);

        expect(columns).toEqual([FIRST]);
    });
});
