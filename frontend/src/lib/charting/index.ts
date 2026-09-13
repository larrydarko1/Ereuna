/**
 * The charting layer's one public door.
 *
 * Nothing outside this directory imports anything else from it, and nothing
 * inside it imports from here — `verbatimModuleSyntax` keeps a type-only import
 * of this file loading the file, so an internal import would evaluate the tools
 * before the base class they extend exists.
 *
 * What is not named here is internal: the whole of `engine/`, and the parts of
 * `drawings/`, `patterns/` and `shared/` that only the layer itself calls.
 */

// The chart
export { createChart } from '@/lib/charting/engine/api/create-chart';
export { CrosshairMode } from '@/lib/charting/engine/model/chart/crosshair';
export { ColorType } from '@/lib/charting/engine/model/chart/layout-options';

export type { IChartApi } from '@/lib/charting/engine/api/create-chart';
export type { ISeriesApi } from '@/lib/charting/engine/api/iseries-api';
export type { MouseEventParams } from '@/lib/charting/engine/api/ichart-api';
export type { SeriesType } from '@/lib/charting/engine/model/series/series-options';
export type { Time } from '@/lib/charting/engine/model/time/types';
export type { LogicalRange } from '@/lib/charting/engine/model/time/time-data';

// Drawing tools
export { BoxManager } from '@/lib/charting/drawings/box';
export { FreehandManager } from '@/lib/charting/drawings/freehand';
export { PriceLevelManager } from '@/lib/charting/drawings/price-level';
export { ChartRuler } from '@/lib/charting/drawings/ruler';
export { TextAnnotationManager } from '@/lib/charting/drawings/text-annotation';
export { TrendLineManager } from '@/lib/charting/drawings/trendline';

// Pattern detection
export { detectAllPatterns } from '@/lib/charting/patterns/detection';
export { PatternOverlayManager } from '@/lib/charting/patterns/overlay';
export type { PatternMatch } from '@/lib/charting/patterns/types';

// Whole-chart features
export { ChartScreenshot } from '@/lib/charting/screenshot';
export type { ScreenshotConfig } from '@/lib/charting/screenshot';
export { ReplayManager } from '@/lib/charting/replay-manager';
