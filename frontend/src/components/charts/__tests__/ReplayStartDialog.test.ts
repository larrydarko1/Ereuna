import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import ReplayStartDialog from '@/components/charts/ReplayStartDialog.vue';

const open = (min: string, max: string): VueWrapper =>
    mount(ReplayStartDialog, { props: { min, max }, attachTo: document.body });

const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const field = (): HTMLInputElement => $('.replay-start__input') as HTMLInputElement;

const type = async (value: string): Promise<void> => {
    field().value = value;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
};

const preset = async (index: number): Promise<void> => {
    [...document.body.querySelectorAll<HTMLElement>('.replay-start__preset')][index]?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
    );
    await Promise.resolve();
};

const confirm = async (): Promise<void> => {
    $('.replay-start__confirm').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('ReplayStartDialog', () => {
    it('opens three months back, so there is something left to replay', () => {
        open('2020-01-01', '2026-03-04');

        expect(field().value).toBe('2025-12-04');
    });

    it('opens at the start of a series shorter than three months', () => {
        open('2026-02-01', '2026-03-04');

        expect(field().value).toBe('2026-02-01');
    });

    it('holds the picker to the series it has bars for', () => {
        open('2020-01-01', '2026-03-04');

        expect(field().min).toBe('2020-01-01');
        expect(field().max).toBe('2026-03-04');
    });

    it('offers presets one, three, six and twelve months back', async () => {
        open('2020-01-01', '2026-03-04');

        await preset(0);
        expect(field().value).toBe('2026-02-04');

        await preset(2);
        expect(field().value).toBe('2025-09-04');

        await preset(3);
        expect(field().value).toBe('2025-03-04');
    });

    it('clamps a preset that reaches back past the first bar', async () => {
        open('2026-01-15', '2026-03-04');

        await preset(3);

        expect(field().value).toBe('2026-01-15');
    });

    it('starts the replay at the date on screen, read as UTC', async () => {
        const wrapper = open('2020-01-01', '2026-03-04');

        await type('2024-06-01');
        await confirm();

        expect(wrapper.emitted('start')?.[0]).toEqual([new Date('2024-06-01T00:00:00Z')]);
    });

    it('refuses a date outside the series', async () => {
        const wrapper = open('2020-01-01', '2026-03-04');

        await type('2019-01-01');
        await confirm();

        expect(wrapper.emitted('start')).toBeUndefined();
        expect($('.replay-start__confirm').hasAttribute('disabled')).toBe(true);
    });

    it('refuses an empty date', async () => {
        const wrapper = open('2020-01-01', '2026-03-04');

        await type('');
        await confirm();

        expect(wrapper.emitted('start')).toBeUndefined();
    });

    it('starts on the form as well as on the button', async () => {
        const wrapper = open('2020-01-01', '2026-03-04');

        $('.replay-start').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await Promise.resolve();

        expect(wrapper.emitted('start')).toHaveLength(1);
    });

    it('names itself for what it is choosing', () => {
        open('2020-01-01', '2026-03-04');

        expect($('.dialog__title').textContent).toBe(i18n.global.t('charts.replay.selectStart'));
    });

    it('closes on the dialog close', async () => {
        const wrapper = open('2020-01-01', '2026-03-04');

        $('.dialog__close').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
