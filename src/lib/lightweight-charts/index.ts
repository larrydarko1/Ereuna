import { customStyleDefaults, seriesOptionsDefaults } from './api/options/series-options-defaults';
import { CustomSeriesOptions } from './model/series-options';

export { LineStyle, LineType } from './renderers/draw-line';

export { TrackingModeExitMode } from './model/chart-model';
export { CrosshairMode } from './model/crosshair';
export { MismatchDirection } from './model/plot-list';
export { PriceScaleMode } from './model/price-scale';
export { PriceLineSource, LastPriceAnimationMode } from './model/series-options';
export { ColorType } from './model/layout-options';

export { isBusinessDay, isUTCTimestamp } from './model/horz-scale-behavior-time/types';
export { TickMarkType } from './model/horz-scale-behavior-time/types';
export const customSeriesDefaultOptions: CustomSeriesOptions = {
	...seriesOptionsDefaults,
	...customStyleDefaults,
};

export { createChart, createChartEx, defaultHorzScaleBehavior } from './api/create-chart';
export { ChartRuler } from './ruler';
export { TrendLineManager } from './trendline';
export type { TrendLine, TrendLinePoint } from './trendline';
export { BoxManager } from './box';
export type { Box, BoxPoint } from './box';
export { TextAnnotationManager } from './text-annotation';
export type { TextAnnotation, TextAnnotationPoint } from './text-annotation';
export { FreehandManager } from './freehand';
export type { FreehandPath, FreehandPoint } from './freehand';
export { ChartScreenshot } from './screenshot';
export type { ScreenshotConfig, ChartInfo } from './screenshot';

// Export additional types needed by the components
export type { IChartApi } from './api/create-chart';
export type { MouseEventParams } from './api/ichart-api';
export type { IPriceLine } from './api/iprice-line';
export type { Time } from './model/horz-scale-behavior-time/types';
export type { LogicalRange } from './model/time-data';

/**
 * Returns the current version as a string. For example `'3.3.0'`.
 */
export function version(): string {
	return '4.1.6';
}
