import { describe, expect, it } from 'vitest';

import { CHART_STYLES, PANEL_SECTIONS, SUMMARY_FIELDS } from '#db/collections.js';
import { LIMITS } from '#limits.js';
import { updatePreferencesBody } from '#requests/identity.js';

/** Whether a preferences patch carrying only these chart settings is one the route takes. */
const takesChart = (chartSettings: unknown): boolean => updatePreferencesBody.safeParse({ chartSettings }).success;

/** Whether a preferences patch carrying only this panel layout is one the route takes. */
const takesPanels = (panels: unknown): boolean => updatePreferencesBody.safeParse({ panels }).success;

describe('updatePreferencesBody', () => {
    it('takes any one preference', () => {
        expect(updatePreferencesBody.safeParse({ theme: null }).success).toBe(true);
    });

    it('refuses an update that changes nothing', () => {
        expect(updatePreferencesBody.safeParse({}).success).toBe(false);
    });
});

describe('its chart settings', () => {
    const valid = {
        style: CHART_STYLES[0],
        indicators: { daily: [{ type: 'SMA' as const, period: 20, visible: true }] },
    };

    it('accepts a complete settings object', () => {
        expect(takesChart(valid)).toBe(true);
    });

    it('rejects an unknown chart style', () => {
        expect(takesChart({ ...valid, style: 'hologram' })).toBe(false);
    });

    it('bounds the indicator period at the shared maximum', () => {
        const over = { type: 'SMA' as const, period: LIMITS.maxIndicatorPeriod + 1, visible: true };
        expect(takesChart({ ...valid, indicators: { daily: [over] } })).toBe(false);
    });

    it('bounds how many indicators one chart may carry', () => {
        const many = Array.from({ length: LIMITS.indicatorsPerChart + 1 }, () => valid.indicators.daily[0]);
        expect(takesChart({ ...valid, indicators: { daily: many } })).toBe(false);
    });

    // A field required here that the client does not send 422s every save, and
    // the chart then silently keeps the defaults it was already drawing
    it('requires nothing beyond the style and the indicators', () => {
        const parsed = updatePreferencesBody.parse({ chartSettings: valid }).chartSettings ?? {};
        expect(Object.keys(parsed).sort()).toEqual(['indicators', 'style']);
    });

    // A client that has only ever configured the daily chart sends the one key
    // it has; demanding all seven would 422 every save it makes
    it('takes the timeframes the client has configured, and only those', () => {
        expect(takesChart({ ...valid, indicators: {} })).toBe(true);
        expect(takesChart({ ...valid, indicators: { hourly: [] } })).toBe(false);
    });
});

describe('its panel layout', () => {
    it('accepts a layout that lists each key once', () => {
        expect(takesPanels({ sections: [PANEL_SECTIONS[0]], summaryFields: [SUMMARY_FIELDS[0]] })).toBe(true);
    });

    it('rejects a section listed twice — it would render in two places', () => {
        expect(takesPanels({ sections: [PANEL_SECTIONS[0], PANEL_SECTIONS[0]], summaryFields: [] })).toBe(false);
    });

    it('rejects a summary field listed twice', () => {
        expect(takesPanels({ sections: [], summaryFields: [SUMMARY_FIELDS[0], SUMMARY_FIELDS[0]] })).toBe(false);
    });

    it('rejects an unknown section', () => {
        expect(takesPanels({ sections: ['nowhere'], summaryFields: [] })).toBe(false);
    });
});
