/**
 * chart-data — a chart's series: bars, volume, and the overlays the user has
 * configured. Overlays are computed here rather than in the browser because the
 * API already holds the full window the average needs; sending 1,250 bars so
 * the client can average them is the same data twice.
 */
import type { ObjectId } from 'mongodb';
import type { ChartIndicator, ChartTimeframe } from '@ereuna/shared';
import { barSeries, type BarSeries } from '@/services/market/index.js';
import { getPreferences } from '@/services/user/index.js';
import { ema, sma, type SeriesPoint } from '@/utils/indicators.js';

type ChartOverlay = {
    type: ChartIndicator['type'];
    period: number;
    points: SeriesPoint[];
};

export type ChartSeries = BarSeries & {
    symbol: string;
    timeframe: ChartTimeframe;
    overlays: ChartOverlay[];
};

/** Overlays used until the user configures their own. */
const DEFAULT_INDICATORS: ChartIndicator[] = [
    { type: 'SMA', period: 10, visible: true },
    { type: 'SMA', period: 20, visible: true },
    { type: 'SMA', period: 50, visible: true },
    { type: 'SMA', period: 200, visible: true },
];

export async function getChartSeries(
    userId: ObjectId,
    symbol: string,
    timeframe: ChartTimeframe,
    options: { before?: Date } = {},
): Promise<ChartSeries> {
    const [series, preferences] = await Promise.all([barSeries(symbol, timeframe, options), getPreferences(userId)]);

    const settings = preferences.chartSettings;
    const indicators = (settings?.indicators ?? DEFAULT_INDICATORS).filter((indicator) => indicator.visible);
    const bars = series.candles.map((candle) => ({ time: candle.time, close: candle.close }));

    return {
        ...series,
        symbol,
        timeframe,
        overlays: indicators.map((indicator) => ({
            type: indicator.type,
            period: indicator.period,
            points: indicator.type === 'EMA' ? ema(bars, indicator.period) : sma(bars, indicator.period),
        })),
    };
}
