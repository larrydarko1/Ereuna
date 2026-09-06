import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { PANEL_SECTIONS, SUMMARY_FIELDS } from '@ereuna/shared';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { loadPreferences } from '@/composables/data/usePreferences';
import PanelLayoutDialog from '@/components/charts/PanelLayoutDialog.vue';

const api = mockApi();

const preferences = (panels: Record<string, unknown> | null): Record<string, unknown> => ({
    language: 'en',
    theme: null,
    defaultSymbol: 'AAPL',
    hiddenSymbols: [],
    chartSettings: null,
    panels,
    screenerColumns: [],
});

const open = (): VueWrapper => mount(PanelLayoutDialog, { attachTo: document.body });

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

const chosen = (): string[] =>
    all('.reorderable__label:not(.reorderable__label--muted)').map((node) => node.textContent?.trim() ?? '');

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

describe('PanelLayoutDialog', () => {
    it('opens on the sections, with the layout in use', () => {
        open();

        expect($('.panel-layout__tab').getAttribute('aria-pressed')).toBe('true');
        expect(chosen()).toHaveLength(PANEL_SECTIONS.length);
    });

    it('swaps to the summary fields', async () => {
        open();

        await click(all('.panel-layout__tab')[1]);

        expect(chosen()).toHaveLength(SUMMARY_FIELDS.length);
    });

    it('starts from the saved layout rather than the shipped one', async () => {
        api.on('GET /api/preferences', preferences({ sections: ['news'], summaryFields: ['symbol'] }));
        await loadPreferences(true);

        open();

        expect(chosen()).toEqual([i18n.global.t('sidebar.sections.news')]);
    });

    it('saves both lists together, since one dialog edits both', async () => {
        api.on('GET /api/preferences', preferences({ sections: ['news'], summaryFields: ['symbol'] }));
        await loadPreferences(true);
        const wrapper = open();

        await click($('.panel-layout__save'));

        expect(api.last().body).toEqual({ panels: { sections: ['news'], summaryFields: ['symbol'] } });
        expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('puts the shipped order back in the draft without storing it', async () => {
        api.on('GET /api/preferences', preferences({ sections: ['news'], summaryFields: ['symbol'] }));
        await loadPreferences(true);
        open();

        await click($('.panel-layout__link'));

        expect(chosen()).toHaveLength(PANEL_SECTIONS.length);
        expect(api.calls.some((call) => call.method === 'PATCH')).toBe(false);
    });

    it('forgets the stored layout outright', async () => {
        const wrapper = open();

        await click(all('.panel-layout__link')[1]);

        expect(api.last().body).toEqual({ panels: null });
        expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('stays open and explains a refused save', async () => {
        api.on('PATCH /api/preferences', { error: 'INTERNAL' }, { status: 500 });
        const wrapper = open();

        await click($('.panel-layout__save'));

        expect($('[role="alert"]').textContent).toBe(i18n.global.t('errors.INTERNAL'));
        expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('closes on the dialog close', async () => {
        const wrapper = open();

        await click($('.dialog__close'));

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
