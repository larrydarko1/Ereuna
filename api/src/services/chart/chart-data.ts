/**
 * chart-data — a chart's series: bars, volume, and the overlays the user has
 * configured. Overlays are computed here rather than in the browser because the
 * API already holds the full window the average needs; sending 1,250 bars so
 * the client can average them is the same data twice.
 */
import type { ObjectId } from 'mongodb';

import type { ChartSeries, ChartTimeframe } from '@ereuna/shared';
import { DEFAULT_INDICATORS } from '@ereuna/shared';

import { barSeries } from '@/services/market/index.js';
import { getPreferences } from '@/services/user/index.js';
import { ema, sma } from '@/utils/indicators.js';

export async function getChartSeries(
    userId: ObjectId,
    symbol: string,
    timeframe: ChartTimeframe,
    options: { before?: Date } = {},
): Promise<ChartSeries> {
    const [series, preferences] = await Promise.all([barSeries(symbol, timeframe, options), getPreferences(userId)]);

    // The averages are read per timeframe: fifty bars is fifty days on the daily
    // chart and a year on the weekly one, so the two carry their own sets.
    const configured = preferences.chartSettings?.indicators[timeframe];
    const indicators = (configured ?? DEFAULT_INDICATORS).filter((indicator) => indicator.visible);
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
