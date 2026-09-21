/**
 * The chart series contract — the shape `/api/charts/:symbol` answers with.
 * Overlays are computed server-side and arrive on the series, so the default
 * set lives here too: until a user configures a timeframe, the overlays the
 * API computes and the legend the frontend draws have to name the same ones.
 */
import type { ChartIndicator, ChartTimeframe } from '#db/collections.js';

export type Candle = {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
};

export type SeriesPoint = {
    time: string;
    value: number;
};

export type ChartOverlay = {
    type: ChartIndicator['type'];
    period: number;
    points: SeriesPoint[];
};

export type ChartSeries = {
    symbol: string;
    timeframe: ChartTimeframe;
    candles: Candle[];
    volume: SeriesPoint[];
    overlays: ChartOverlay[];
};

/** The overlays a timeframe carries until the user configures that timeframe. */
export const DEFAULT_INDICATORS: readonly ChartIndicator[] = [
    { type: 'SMA', period: 10, visible: true },
    { type: 'SMA', period: 20, visible: true },
    { type: 'SMA', period: 50, visible: true },
    { type: 'SMA', period: 200, visible: true },
];
