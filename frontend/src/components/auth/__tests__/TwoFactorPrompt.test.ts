import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import TwoFactorPrompt from '@/components/auth/TwoFactorPrompt.vue';

const prompt = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(TwoFactorPrompt, { props, attachTo: document.body });

/** Let the mounted hook's own focus land before a test moves focus itself. */
const opened = async (props: Record<string, unknown> = {}): Promise<VueWrapper> => {
    const wrapper = prompt(props);
    await new Promise((resolve) => setTimeout(resolve, 0));
    return wrapper;
};

const boxes = (wrapper: VueWrapper): ReturnType<VueWrapper['findAll']> => wrapper.findAll('.prompt__digit');

/** Type into one box the way a keyboard, a paste or an autofill would. */
const typeInto = async (wrapper: VueWrapper, index: number, value: string): Promise<void> => {
    const box = boxes(wrapper)[index];
    await box?.setValue(value);
};

describe('TwoFactorPrompt', () => {
    it('is a modal dialog with a name and a hint', () => {
        const wrapper = prompt();
        const dialog = wrapper.get('[role="dialog"]');

        expect(dialog.attributes('aria-modal')).toBe('true');
        expect(dialog.attributes('aria-label')).toBe(i18n.global.t('auth.twoFactorTitle'));
        expect(wrapper.get('#two-factor-hint').text()).toBe(i18n.global.t('auth.twoFactorHint'));
    });

    it('offers six numbered boxes, each named', () => {
        const wrapper = prompt();

        expect(boxes(wrapper)).toHaveLength(6);
        expect(boxes(wrapper)[0]?.attributes('aria-label')).toBe(i18n.global.t('auth.twoFactorDigit', { n: 1 }));
        expect(boxes(wrapper)[0]?.attributes('inputmode')).toBe('numeric');
        expect(boxes(wrapper)[0]?.attributes('autocomplete')).toBe('one-time-code');
    });

    it('focuses the first box on open', async () => {
        const wrapper = prompt();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(document.activeElement).toBe(boxes(wrapper)[0]?.element);
    });

    it('submits once the last digit lands', async () => {
        const wrapper = prompt();

        for (let index = 0; index < 6; index += 1) await typeInto(wrapper, index, String(index + 1));

        expect(wrapper.emitted('submit')).toEqual([['123456']]);
    });

    it('spreads a pasted code across the boxes rather than keeping one character', async () => {
        const wrapper = prompt();

        await typeInto(wrapper, 0, '123456');

        expect(wrapper.emitted('submit')).toEqual([['123456']]);
    });

    it('keeps only the digits out of a pasted string', async () => {
        const wrapper = prompt();

        await typeInto(wrapper, 0, '12-34 56');

        expect(wrapper.emitted('submit')).toEqual([['123456']]);
    });

    it('does not run past the last box when a long code is pasted into a later one', async () => {
        const wrapper = prompt();

        await typeInto(wrapper, 4, '123456');

        expect(wrapper.emitted('submit')).toBeUndefined();
        expect((boxes(wrapper)[5]?.element as HTMLInputElement).value).toBe('2');
    });

    it('clears a box when its content is erased', async () => {
        const wrapper = prompt();
        await typeInto(wrapper, 0, '1');

        await typeInto(wrapper, 0, '');

        expect((boxes(wrapper)[0]?.element as HTMLInputElement).value).toBe('');
    });

    it('clears the digit under the cursor on the first Backspace', async () => {
        const wrapper = prompt();
        await typeInto(wrapper, 0, '12');

        await boxes(wrapper)[1]?.trigger('keydown', { key: 'Backspace' });

        expect((boxes(wrapper)[0]?.element as HTMLInputElement).value).toBe('1');
    });

    it('steps back once the box is already empty', async () => {
        const wrapper = await opened();
        await typeInto(wrapper, 0, '12');
        await typeInto(wrapper, 1, '');

        await boxes(wrapper)[1]?.trigger('keydown', { key: 'Backspace' });

        expect((boxes(wrapper)[0]?.element as HTMLInputElement).value).toBe('');
        expect(document.activeElement).toBe(boxes(wrapper)[0]?.element);
    });

    it('does not step back off the first box', async () => {
        const wrapper = prompt();

        await boxes(wrapper)[0]?.trigger('keydown', { key: 'Backspace' });

        expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('walks the boxes with the arrow keys', async () => {
        const wrapper = await opened();

        await boxes(wrapper)[0]?.trigger('keydown', { key: 'ArrowRight' });
        expect(document.activeElement).toBe(boxes(wrapper)[1]?.element);

        await boxes(wrapper)[1]?.trigger('keydown', { key: 'ArrowLeft' });
        expect(document.activeElement).toBe(boxes(wrapper)[0]?.element);
    });

    it('stays inside the row at either end', async () => {
        const wrapper = await opened();

        await boxes(wrapper)[0]?.trigger('keydown', { key: 'ArrowLeft' });
        expect(document.activeElement).toBe(boxes(wrapper)[0]?.element);

        await boxes(wrapper)[5]?.trigger('keydown', { key: 'ArrowRight' });
        expect(document.activeElement).toBe(boxes(wrapper)[5]?.element);
    });

    it('refuses an incomplete code on the verify button', async () => {
        const wrapper = prompt();
        await typeInto(wrapper, 0, '123');

        await wrapper.get('.prompt__verify').trigger('click');

        expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('cancels on the button and on Escape', async () => {
        const wrapper = prompt();

        await wrapper.get('.prompt__cancel').trigger('click');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(wrapper.emitted('cancel')).toHaveLength(2);
    });

    it('locks the boxes and shows a spinner while the code is being checked', () => {
        const wrapper = prompt({ pending: true });

        expect((boxes(wrapper)[0]?.element as HTMLInputElement).disabled).toBe(true);
        expect(wrapper.find('.spinner').exists()).toBe(true);
    });

    it('clears itself for the next attempt after a rejected code', async () => {
        const wrapper = prompt();
        await typeInto(wrapper, 0, '123456');

        (wrapper.vm as unknown as { reset: () => void }).reset();
        await wrapper.vm.$nextTick();

        for (const box of boxes(wrapper)) expect((box.element as HTMLInputElement).value).toBe('');
    });
});
