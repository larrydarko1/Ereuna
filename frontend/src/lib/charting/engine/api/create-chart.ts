/**
 * The one way to build a chart.
 *
 * `createChart` fixes the horizontal scale to time; `createChartEx` is the general
 * form it delegates to, kept private because nothing here charts anything but
 * time.
 */
import { assert } from '@/lib/charting/engine/helpers/assertions';
import { type DeepPartial, isString } from '@/lib/charting/engine/helpers/strict-type-checks';
import { HorzScaleBehaviorTime } from '@/lib/charting/engine/model/time/horz-scale-behavior';
import { type TimeChartOptions } from '@/lib/charting/engine/model/time/time-based-chart-options';
import { type Time } from '@/lib/charting/engine/model/time/types';
import { type IHorzScaleBehavior } from '@/lib/charting/engine/model/time/ihorz-scale-behavior';
import { ChartApi } from '@/lib/charting/engine/api/chart-api';
import { type IChartApiBase } from '@/lib/charting/engine/api/ichart-api';

/**
 * Structure describing options of the chart with time points at the horizontal scale. Series options are to be set separately
 */
export type ChartOptions = TimeChartOptions;

/**
 * The main interface of a single chart using time for horizontal scale.
 */
export type IChartApi = {
    /**
     * Applies new options to the chart
     *
     * @param options - Any subset of options.
     */
    applyOptions(options: DeepPartial<ChartOptions>): void;
} & IChartApiBase<Time>;

/**
 * This function is the simplified main entry point of the Lightweight Charting Library with time points for the horizontal scale.
 *
 * @param container - ID of HTML element or element itself
 * @param options - Any subset of options to be applied at start.
 * @returns An interface to the created chart
 */
export function createChart(container: string | HTMLElement, options?: DeepPartial<ChartOptions>): IChartApi {
    return createChartEx<Time, HorzScaleBehaviorTime>(
        container,
        new HorzScaleBehaviorTime(),
        HorzScaleBehaviorTime.applyDefaults(options),
    );
}

/**
 * This function is the main entry point of the Lightweight Charting Library. If you are using time values
 * for the horizontal scale then it is recommended that you rather use the {@link createChart} function.
 *
 * @template THorzScaleItem - type of points on the horizontal scale
 * @template THorzScaleBehavior - type of horizontal axis strategy that encapsulate all the specific behaviors of the horizontal scale type
 *
 * @param container - ID of HTML element or element itself
 * @param horzScaleBehavior - Horizontal scale behavior
 * @param options - Any subset of options to be applied at start.
 * @returns An interface to the created chart
 */
function createChartEx<THorzScaleItem, THorzScaleBehavior extends IHorzScaleBehavior<THorzScaleItem>>(
    container: string | HTMLElement,
    horzScaleBehavior: THorzScaleBehavior,
    options?: DeepPartial<ReturnType<THorzScaleBehavior['options']>>,
): IChartApiBase<THorzScaleItem> {
    let htmlElement: HTMLElement;
    if (isString(container)) {
        const element = document.getElementById(container);
        assert(element !== null, `Cannot find element in DOM with id=${container}`);
        htmlElement = element;
    } else {
        htmlElement = container;
    }

    const res = new ChartApi<THorzScaleItem>(htmlElement, horzScaleBehavior, options);
    horzScaleBehavior.setOptions(res.options());
    return res;
}
