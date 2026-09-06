import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { i18n } from '@/i18n';
import PasswordField from '@/components/ui/PasswordField.vue';

const field = (props: Record<string, unknown> = {}): ReturnType<typeof mount> =>
    mount(PasswordField, { props: { label: 'Password', modelValue: '', ...props } });

describe('PasswordField', () => {
    it('is masked, and autocompletes as an existing password by default', () => {
        const wrapper = field();

        expect(wrapper.get('input').attributes('type')).toBe('password');
        expect(wrapper.get('input').attributes('autocomplete')).toBe('current-password');
    });

    it('autocompletes as a new password when told to', () => {
        expect(field({ autocomplete: 'new-password' }).get('input').attributes('autocomplete')).toBe('new-password');
    });

    it('reveals and re-masks on the toggle', async () => {
        const wrapper = field();
        const toggle = wrapper.get('button');

        expect(toggle.attributes('aria-label')).toBe(i18n.global.t('auth.showPassword'));
        expect(toggle.attributes('aria-pressed')).toBe('false');

        await toggle.trigger('click');

        expect(wrapper.get('input').attributes('type')).toBe('text');
        expect(toggle.attributes('aria-label')).toBe(i18n.global.t('auth.hidePassword'));
        expect(toggle.attributes('aria-pressed')).toBe('true');

        await toggle.trigger('click');

        expect(wrapper.get('input').attributes('type')).toBe('password');
    });

    it('reports what the user typed', async () => {
        const wrapper = field();

        await wrapper.get('input').setValue('Str0ng!pass');

        expect(wrapper.emitted('update:modelValue')).toEqual([['Str0ng!pass']]);
    });

    it('names the error from the input', () => {
        const wrapper = field({ error: 'Password is required' });

        expect(wrapper.get('input').attributes('aria-describedby')).toBe(wrapper.get('.field__error').attributes('id'));
    });

    it('ties the label to the input', () => {
        const wrapper = field();

        expect(wrapper.get('label').attributes('for')).toBe(wrapper.get('input').attributes('id'));
    });
});
