import { type ChartOptionsImpl } from '@/lib/lightweight-charts/model/chart-model';
import { type HorzScaleOptions } from '@/lib/lightweight-charts/model/time-scale';
import { type TickMarkFormatter } from '@/lib/lightweight-charts/model/horz-scale-behavior-time/horz-scale-behavior-time';
import { type Time } from '@/lib/lightweight-charts/model/horz-scale-behavior-time/types';

/**
 * Extended time scale options for time-based horizontal scale
 */
export type TimeScaleOptions = {
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
