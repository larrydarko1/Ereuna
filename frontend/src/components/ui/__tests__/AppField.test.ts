import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AppField from '@/components/ui/AppField.vue';

const field = (props: Record<string, unknown> = {}): ReturnType<typeof mount> =>
    mount(AppField, { props: { label: 'Username', modelValue: '', ...props } });

describe('AppField', () => {
    it('ties the label to the input it labels', () => {
        const wrapper = field();

        expect(wrapper.get('label').attributes('for')).toBe(wrapper.get('input').attributes('id'));
        expect(wrapper.get('label').text()).toBe('Username');
    });

    it('is a text input by default', () => {
        expect(field().get('input').attributes('type')).toBe('text');
    });

    it('takes the type, autocomplete and placeholder it is given', () => {
        const wrapper = field({ type: 'email', autocomplete: 'email', placeholder: 'you@example.com' });

        expect(wrapper.get('input').attributes('type')).toBe('email');
        expect(wrapper.get('input').attributes('autocomplete')).toBe('email');
        expect(wrapper.get('input').attributes('placeholder')).toBe('you@example.com');
    });

    it('reports what the user typed', async () => {
        const wrapper = field();

        await wrapper.get('input').setValue('larry');

        expect(wrapper.emitted('update:modelValue')).toEqual([['larry']]);
    });

    it('shows nothing about validity until there is an error', () => {
        const wrapper = field();

        expect(wrapper.find('.field__error').exists()).toBe(false);
        expect(wrapper.get('input').attributes('aria-invalid')).toBe('false');
        expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined();
    });

    it('names the error from the input, so a screen reader reads it with the field', () => {
        const wrapper = field({ error: 'Username is required' });
        const error = wrapper.get('.field__error');

        expect(error.text()).toBe('Username is required');
        expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
        expect(wrapper.get('input').attributes('aria-describedby')).toBe(error.attributes('id'));
        expect(wrapper.get('input').classes()).toContain('field__input--invalid');
    });
});
