import { beforeEach, describe, expect, it } from 'vitest';
import type { ChartIndicator, ChartSettings, ChartTimeframe } from '@ereuna/shared';
import { mockApi } from '@/__tests__/support/msw';
import { clearAuth } from '@/api/client';
import { loadPreferences } from '@/composables/data/usePreferences';
import {
    DEFAULT_CHART_SETTINGS,
    DEFAULT_INDICATORS,
    MAX_INDICATOR_PERIOD,
    useChartSettings,
} from '@/composables/charts/useChartSettings';

const mock = mockApi();
const { settings, indicatorsFor, save, saveIndicators } = useChartSettings();

const preferences = (chartSettings: ChartSettings | null): Record<string, unknown> => ({
    language: 'en',
    theme: null,
    defaultSymbol: 'AAPL',
    hiddenSymbols: [],
    chartSettings,
    panels: null,
    screenerColumns: [],
});

const draft = (indicators: ChartIndicator[]): ChartSettings => ({
    ...DEFAULT_CHART_SETTINGS,
    indicators: { daily: indicators },
});

const savedIndicators = (timeframe: ChartTimeframe = 'daily'): ChartIndicator[] =>
    (mock.last().body as { chartSettings: ChartSettings }).chartSettings.indicators[timeframe] ?? [];

beforeEach(() => {
    clearAuth();
});

describe('settings', () => {
    it('answers with the defaults until the user has configured a chart', () => {
        expect(settings.value).toEqual(DEFAULT_CHART_SETTINGS);
    });

    it('defaults to the four averages the API also computes', () => {
        expect(DEFAULT_INDICATORS.map((one) => one.period)).toEqual([10, 20, 50, 200]);
    });

    it('answers with the stored settings once they are loaded', async () => {
        const stored: ChartSettings = { ...DEFAULT_CHART_SETTINGS, style: 'line' };
        mock.on('GET /api/preferences', preferences(stored));

        await loadPreferences();

        expect(settings.value).toEqual(stored);
    });
});

describe('save', () => {
    it('writes the draft through to the preferences', async () => {
        mock.on('PATCH /api/preferences', preferences(DEFAULT_CHART_SETTINGS));

        await save({ ...DEFAULT_CHART_SETTINGS, style: 'line' });

        expect(mock.last().body).toMatchObject({ chartSettings: { style: 'line' } });
    });

    it('keeps only the four overlays the palette has colours for', async () => {
        mock.on('PATCH /api/preferences', preferences(DEFAULT_CHART_SETTINGS));

        await save(draft([10, 20, 50, 200, 400].map((period) => ({ type: 'SMA' as const, period, visible: true }))));

        expect(savedIndicators()).toHaveLength(4);
    });

    it('rounds a period the dialog left as a decimal', async () => {
        mock.on('PATCH /api/preferences', preferences(DEFAULT_CHART_SETTINGS));

        await save(draft([{ type: 'SMA', period: 20.6, visible: true }]));

        expect(savedIndicators()[0]?.period).toBe(21);
    });

    it('replaces the NaN a number input holds between keystrokes', async () => {
        mock.on('PATCH /api/preferences', preferences(DEFAULT_CHART_SETTINGS));

        await save(draft([{ type: 'SMA', period: Number.NaN, visible: true }]));

        expect(savedIndicators()[0]?.period).toBe(1);
    });

    it('brings a period inside the bounds the API validates against', async () => {
        mock.on('PATCH /api/preferences', preferences(DEFAULT_CHART_SETTINGS));

        await save(
            draft([
                { type: 'SMA', period: 0, visible: true },
                { type: 'EMA', period: MAX_INDICATOR_PERIOD + 500, visible: true },
            ]),
        );

        expect(savedIndicators().map((one) => one.period)).toEqual([1, MAX_INDICATOR_PERIOD]);
    });

    it('leaves the rest of the indicator alone', async () => {
        mock.on('PATCH /api/preferences', preferences(DEFAULT_CHART_SETTINGS));

        await save(draft([{ type: 'EMA', period: 21, visible: false }]));

        expect(savedIndicators()[0]).toEqual({ type: 'EMA', period: 21, visible: false });
    });
});

describe('indicatorsFor', () => {
    it('defaults a timeframe nobody has configured', () => {
        expect(indicatorsFor('weekly')).toEqual([...DEFAULT_INDICATORS]);
    });

    // Fifty bars is fifty days on the daily chart and a year on the weekly one,
    // and the screener draws the two side by side.
    it('reads each timeframe its own set', async () => {
        mock.on(
            'GET /api/preferences',
            preferences({ style: 'candlestick', indicators: { weekly: [{ type: 'EMA', period: 9, visible: true }] } }),
        );

        await loadPreferences();

        expect(indicatorsFor('weekly')).toEqual([{ type: 'EMA', period: 9, visible: true }]);
        expect(indicatorsFor('daily')).toEqual([...DEFAULT_INDICATORS]);
    });
});

describe('saveIndicators', () => {
    it('carries the other timeframes through, because PATCH replaces the whole object', async () => {
        mock.on(
            'GET /api/preferences',
            preferences({ style: 'candlestick', indicators: { weekly: [{ type: 'EMA', period: 9, visible: true }] } }),
        );
        await loadPreferences();
        mock.on('PATCH /api/preferences', preferences(DEFAULT_CHART_SETTINGS));

        await saveIndicators('daily', [{ type: 'SMA', period: 5, visible: true }]);

        expect(savedIndicators('daily')).toEqual([{ type: 'SMA', period: 5, visible: true }]);
        expect(savedIndicators('weekly')).toEqual([{ type: 'EMA', period: 9, visible: true }]);
    });
});
