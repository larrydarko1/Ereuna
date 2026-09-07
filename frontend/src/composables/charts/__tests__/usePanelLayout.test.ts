import { beforeEach, describe, expect, it } from 'vitest';
import { PANEL_SECTIONS, SUMMARY_FIELDS } from '@ereuna/shared';
import { mockApi } from '@/__tests__/support/msw';
import { clearAuth } from '@/api/client';
import { loadPreferences } from '@/composables/data/usePreferences';
import { usePanelLayout } from '@/composables/charts/usePanelLayout';

const mock = mockApi();
const { sections, summaryFields, save, reset } = usePanelLayout();

const preferences = (panels: unknown): Record<string, unknown> => ({
    language: 'en',
    theme: null,
    defaultSymbol: 'AAPL',
    hiddenSymbols: [],
    chartSettings: null,
    panels,
    screenerColumns: [],
});

beforeEach(() => {
    clearAuth();
});

describe('the stored layout', () => {
    it('gives a user who has never touched it the full default order', () => {
        expect(sections.value).toEqual(PANEL_SECTIONS);
        expect(summaryFields.value).toEqual(SUMMARY_FIELDS);
    });

    it('reads order as the array order and hidden as absence', async () => {
        mock.on(
            'GET /api/preferences',
            preferences({ sections: ['summary', 'notes'], summaryFields: ['symbol', 'pe'] }),
        );

        await loadPreferences();

        expect(sections.value).toEqual(['summary', 'notes']);
        expect(summaryFields.value).toEqual(['symbol', 'pe']);
    });

    it('treats a null layout as no stored layout rather than an empty sidebar', async () => {
        mock.on('GET /api/preferences', preferences(null));

        await loadPreferences();

        expect(sections.value).toEqual(PANEL_SECTIONS);
    });
});

describe('save', () => {
    it('sends a plain copy of both lists', async () => {
        mock.on('PATCH /api/preferences', preferences(null));

        await save({ sections: ['summary'], summaryFields: ['symbol'] });

        expect(mock.last().body).toEqual({ panels: { sections: ['summary'], summaryFields: ['symbol'] } });
    });
});

describe('reset', () => {
    it('clears the customisation with an explicit null', async () => {
        mock.on('PATCH /api/preferences', preferences(null));

        await reset();

        expect(mock.last().body).toEqual({ panels: null });
    });
});
