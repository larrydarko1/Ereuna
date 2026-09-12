import {
    customStyleDefaults,
    seriesOptionsDefaults,
} from '@/lib/lightweight-charts/api/options/series-options-defaults';
import { type CustomSeriesOptions } from '@/lib/lightweight-charts/model/series-options';

export { LineStyle, LineType } from '@/lib/lightweight-charts/renderers/draw-line';

export { TrackingModeExitMode } from '@/lib/lightweight-charts/model/chart-model';
export { CrosshairMode } from '@/lib/lightweight-charts/model/crosshair';
export { MismatchDirection } from '@/lib/lightweight-charts/model/plot-list';
export { PriceScaleMode } from '@/lib/lightweight-charts/model/price-scale';
export { PriceLineSource, LastPriceAnimationMode } from '@/lib/lightweight-charts/model/series-options';
export { ColorType } from '@/lib/lightweight-charts/model/layout-options';

export { isBusinessDay, isUTCTimestamp } from '@/lib/lightweight-charts/model/horz-scale-behavior-time/types';
export { TickMarkType } from '@/lib/lightweight-charts/model/horz-scale-behavior-time/types';
export const customSeriesDefaultOptions: CustomSeriesOptions = {
    ...seriesOptionsDefaults,
    ...customStyleDefaults,
};

export { createChart, createChartEx, defaultHorzScaleBehavior } from '@/lib/lightweight-charts/api/create-chart';
export { ChartRuler } from '@/lib/lightweight-charts/ruler';
export { TrendLineManager } from '@/lib/lightweight-charts/trendline';
export type { TrendLine, TrendLinePoint } from '@/lib/lightweight-charts/trendline';
export { BoxManager } from '@/lib/lightweight-charts/box';
export type { Box, BoxPoint } from '@/lib/lightweight-charts/box';
export { TextAnnotationManager } from '@/lib/lightweight-charts/text-annotation';
export type { TextAnnotation, TextAnnotationPoint } from '@/lib/lightweight-charts/text-annotation';
export { FreehandManager } from '@/lib/lightweight-charts/freehand';
export type { FreehandPath, FreehandPoint } from '@/lib/lightweight-charts/freehand';
export { ChartScreenshot } from '@/lib/lightweight-charts/screenshot';
export type { ScreenshotConfig, ChartInfo } from '@/lib/lightweight-charts/screenshot';

// Export additional types needed by the components
export type { IChartApi } from '@/lib/lightweight-charts/api/create-chart';
export type { ISeriesApi } from '@/lib/lightweight-charts/api/iseries-api';
export type { SeriesType } from '@/lib/lightweight-charts/model/series-options';
export type { MouseEventParams } from '@/lib/lightweight-charts/api/ichart-api';
export type { IPriceLine } from '@/lib/lightweight-charts/api/iprice-line';
export type { Time } from '@/lib/lightweight-charts/model/horz-scale-behavior-time/types';
export type { LogicalRange } from '@/lib/lightweight-charts/model/time-data';
export type {
    SeriesMarker,
    SeriesMarkerPosition,
    SeriesMarkerShape,
} from '@/lib/lightweight-charts/model/series-markers';

/**
 * Returns the current version as a string. For example `'3.3.0'`.
 */
export function version(): string {
    return '4.1.6';
}
