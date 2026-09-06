import { describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { useEscapeToClose } from '@/composables/ui/useEscapeToClose';

const host = (close: () => void): ReturnType<typeof defineComponent> =>
    defineComponent({
        setup() {
            useEscapeToClose(close);
            return () => null;
        },
    });

const press = (key: string): void => void document.dispatchEvent(new KeyboardEvent('keydown', { key }));

describe('useEscapeToClose', () => {
    it('closes on Escape, wherever the focus sits inside the dialog', () => {
        const close = vi.fn();
        mount(host(close));

        press('Escape');

        expect(close).toHaveBeenCalledTimes(1);
    });

    it('ignores every other key', () => {
        const close = vi.fn();
        mount(host(close));

        press('Enter');
        press('a');

        expect(close).not.toHaveBeenCalled();
    });

    it('stops answering once the dialog is gone', () => {
        const close = vi.fn();
        const wrapper = mount(host(close));

        wrapper.unmount();
        press('Escape');

        expect(close).not.toHaveBeenCalled();
    });
});
