import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { CHART_STYLES } from '@ereuna/shared';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { DEFAULT_CHART_SETTINGS, MAX_INDICATOR_PERIOD } from '@/composables/charts/useChartSettings';
import { loadPreferences } from '@/composables/data/usePreferences';
import ChartSettingsDialog from '@/components/charts/ChartSettingsDialog.vue';

const api = mockApi();

const preferences = (chartSettings: Record<string, unknown> | null): Record<string, unknown> => ({
    language: 'en',
    theme: null,
    defaultSymbol: 'AAPL',
    hiddenSymbols: [],
    chartSettings,
    panels: null,
    screenerColumns: [],
});

const open = (): VueWrapper => mount(ChartSettingsDialog, { attachTo: document.body });

const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const all = (selector: string): HTMLElement[] => [...document.body.querySelectorAll<HTMLElement>(selector)];

const click = async (element: HTMLElement | undefined): Promise<void> => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
};

const set = async (element: HTMLElement | undefined, value: string): Promise<void> => {
    if (element === undefined) throw new Error('no field to set');
    (element as HTMLInputElement).value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await flushPromises();
};

const periods = (): string[] => all('.chart-settings__number').map((node) => (node as HTMLInputElement).value);

beforeEach(async () => {
    clearAuth();
    document.body.innerHTML = '';
    api.on('GET /api/preferences', preferences(null));
    api.on('PATCH /api/preferences', preferences(null));
    await loadPreferences(true);
});

afterEach(() => {
    document.body.innerHTML = '';
});

describe('ChartSettingsDialog', () => {
    it('offers every chart style the contract names', () => {
        open();

        expect(all('.chart-settings__select option').length).toBeGreaterThanOrEqual(CHART_STYLES.length);
    });

    it('opens on the settings in use', () => {
        open();

        expect(($('.chart-settings__select') as HTMLSelectElement).value).toBe(DEFAULT_CHART_SETTINGS.style);
        expect(periods()).toEqual(DEFAULT_CHART_SETTINGS.indicators.map((one) => String(one.period)));
    });

    it('opens on the account’s own settings when there are some', async () => {
        api.on('GET /api/preferences', preferences({ ...DEFAULT_CHART_SETTINGS, style: 'line' }));
        await loadPreferences(true);

        open();

        expect(($('.chart-settings__select') as HTMLSelectElement).value).toBe('line');
    });

    it('writes nothing until Save, so closing is a real cancel', async () => {
        const wrapper = open();

        await set($('.chart-settings__select'), 'line');
        await click($('.dialog__close'));

        expect(api.calls.some((call) => call.method === 'PATCH')).toBe(false);
        expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('saves the whole settings document', async () => {
        const wrapper = open();

        await set($('.chart-settings__select'), 'line');
        await click($('.chart-settings__save'));

        expect(api.last().body).toMatchObject({ chartSettings: { style: 'line' } });
        expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('holds an overlay period to the ceiling the API enforces', () => {
        open();

        expect(all('.chart-settings__number')[0]?.getAttribute('max')).toBe(String(MAX_INDICATOR_PERIOD));
    });

    it('reads a cleared period as one rather than writing NaN into the draft', async () => {
        open();

        await set(all('.chart-settings__number')[0], '');
        await click($('.chart-settings__save'));

        expect(api.last().body).toMatchObject({
            chartSettings: { indicators: [{ period: 1, type: 'SMA', visible: true }, {}, {}, {}] },
        });
    });

    it('puts the shipped settings back in the draft without storing them', async () => {
        api.on('GET /api/preferences', preferences({ ...DEFAULT_CHART_SETTINGS, style: 'line' }));
        await loadPreferences(true);
        open();

        await click($('.chart-settings__link'));

        expect(($('.chart-settings__select') as HTMLSelectElement).value).toBe(DEFAULT_CHART_SETTINGS.style);
        expect(api.calls.some((call) => call.method === 'PATCH')).toBe(false);
    });

    it('stays open and explains a refused save', async () => {
        api.on('PATCH /api/preferences', { error: 'INTERNAL' }, { status: 500 });
        const wrapper = open();

        await click($('.chart-settings__save'));

        expect($('[role="alert"]').textContent).toBe(i18n.global.t('errors.INTERNAL'));
        expect(wrapper.emitted('close')).toBeUndefined();
    });
});
