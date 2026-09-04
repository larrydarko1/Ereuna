/**
 * useChartSettings — how the chart is drawn, as a user preference.
 * Which overlays to average, how a bar is shaped and which corporate actions
 * are flagged belong to the person, not to any one instrument, so they live in
 * `/api/preferences` alongside the theme and the default symbol.
 * The chart this replaces read them from `/api/:user/indicators`, an endpoint
 * that returned an untyped blob, and wrote them to `/api/chart-settings` — a
 * different shape at a different path, which is why the two drifted: the
 * reader coerced `timeframe` from a string on every load because the writer
 * had been sending it as one.
 */
import { computed, type ComputedRef } from 'vue';
import type { ChartIndicator, ChartSettings } from '@ereuna/shared';
import { patchPreferences, usePreferences } from '@/composables/data/usePreferences';

export type UseChartSettingsReturn = {
    settings: ComputedRef<ChartSettings>;
    save: (next: ChartSettings) => Promise<void>;
};

/**
 * What a chart looks like before anyone has configured one.
 * The four averages match the API's own defaults in `chart-data.ts`: until the
 * user saves something, the overlays the server computes and the legend the
 * client draws have to agree on what they are.
 */
export const DEFAULT_CHART_SETTINGS: ChartSettings = {
    style: 'candlestick',
    indicators: [
        { type: 'SMA', period: 10, visible: true },
        { type: 'SMA', period: 20, visible: true },
        { type: 'SMA', period: 50, visible: true },
        { type: 'SMA', period: 200, visible: true },
    ],
    intrinsicValue: false,
    markers: { earnings: true, dividends: true, splits: true },
};


/** `config.limits.maxIndicatorPeriod` on the API side. */
export const MAX_INDICATOR_PERIOD = 400;

/**
 * The API accepts twelve overlays; the palette defines four colours. Four is
 * the honest limit, because a fifth line would have to borrow a colour already
 * in use and the legend would name two different averages the same.
 */
const MAX_INDICATORS = 4;

export function useChartSettings(): UseChartSettingsReturn {
    const { preferences } = usePreferences();

    // The preferences cache hands out a deep-readonly view so nothing can edit
    // the shared copy in place. The dialog needs a mutable draft, so what comes
    // out here is widened once, here, rather than cast at every call site.
    const settings = computed<ChartSettings>(
        () => (preferences.value?.chartSettings as ChartSettings | null | undefined) ?? DEFAULT_CHART_SETTINGS,
    );

    async function save(next: ChartSettings): Promise<void> {
        await patchPreferences({ chartSettings: normalise(next) });
    }

    return { settings, save };
}

/**
 * Bring a settings draft inside the bounds the API validates against.
 * The dialog binds a number input straight to the period, so it can hold NaN
 * between keystrokes and whatever the user typed after them; sending that
 * would come back 400 and lose the rest of the form with it.
 */
function normalise(settings: ChartSettings): ChartSettings {
    return {
        ...settings,
        indicators: settings.indicators.slice(0, MAX_INDICATORS).map(normaliseIndicator),
    };
}

function normaliseIndicator(indicator: ChartIndicator): ChartIndicator {
    const period = Math.round(indicator.period);
    return {
        ...indicator,
        period: Number.isFinite(period) ? Math.min(MAX_INDICATOR_PERIOD, Math.max(1, period)) : 1,
    };
}
