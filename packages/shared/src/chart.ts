/**
 * The overlays a timeframe carries until the user configures that timeframe.
 * They live here because two sides have to name the same ones: the API computes
 * them onto the series, and the frontend draws their legend.
 */
import type { ChartIndicator } from '#db/collections.js';

export const DEFAULT_INDICATORS: readonly ChartIndicator[] = [
    { type: 'SMA', period: 10, visible: true },
    { type: 'SMA', period: 20, visible: true },
    { type: 'SMA', period: 50, visible: true },
    { type: 'SMA', period: 200, visible: true },
];
