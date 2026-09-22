/**
 * The chart options once the horizontal scale is known to be time.
 */
import { type ChartOptionsImpl } from '@/lib/charting/engine/model/chart/chart-model';
import { type TickMarkFormatter } from '@/lib/charting/engine/model/time/horz-scale-behavior';
import { type HorzScaleOptions } from '@/lib/charting/engine/model/time/time-scale';
import { type Time } from '@/lib/charting/engine/model/time/types';

/**
 * Extended time scale options for time-based horizontal scale
 */
type TimeScaleOptions = {
    /**
     * Tick marks formatter can be used to customize tick marks labels on the time axis.
     *
     * @defaultValue `undefined`
     */
    tickMarkFormatter?: TickMarkFormatter;
} & HorzScaleOptions;

/**
 * Options for chart with time at the horizontal scale
 */
export type TimeChartOptions = {
    /**
     * Extended time scale options with option to override tickMarkFormatter
     */
    timeScale: TimeScaleOptions;
} & ChartOptionsImpl<Time>;
