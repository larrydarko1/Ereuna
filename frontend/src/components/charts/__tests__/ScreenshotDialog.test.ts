import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { clearAuth } from '@/api/client';
import { useChartTheme } from '@/composables/charts/useChartTheme';
import ScreenshotDialog from '@/components/charts/ScreenshotDialog.vue';

const open = (): VueWrapper => mount(ScreenshotDialog, { attachTo: document.body });

const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const boxes = (): HTMLInputElement[] => [...document.body.querySelectorAll<HTMLInputElement>('.screenshot input')];

const download = async (): Promise<void> => {
    $('.screenshot__download').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
};

beforeEach(() => {
    clearAuth();
});

afterEach(() => {
    document.body.innerHTML = '';
});

describe('ScreenshotDialog', () => {
    it('starts with everything included', () => {
        open();

        expect(boxes().map((box) => box.checked)).toEqual([true, true, true]);
    });

    it('exports what is ticked, on the theme the chart is drawn in', async () => {
        const { palette } = useChartTheme();
        const wrapper = open();

        await download();

        expect(wrapper.emitted('export')?.[0]).toEqual([
            {
                includeChartInfo: true,
                includeLogo: true,
                includeWatermark: true,
                backgroundColor: palette.value.surface,
            },
        ]);
    });

    it('leaves out what was unticked', async () => {
        const wrapper = open();

        boxes()[1]?.click();
        await Promise.resolve();
        await download();

        expect(wrapper.emitted('export')?.[0]?.[0]).toMatchObject({ includeLogo: false, includeChartInfo: true });
    });

    it('closes on the dialog close', async () => {
        const wrapper = open();

        $('.dialog__close').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
