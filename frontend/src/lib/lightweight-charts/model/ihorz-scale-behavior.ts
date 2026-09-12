import { type Mutable } from '@/lib/lightweight-charts/helpers/mutable';
import { type Nominal } from '@/lib/lightweight-charts/helpers/nominal';

import { type ChartOptionsImpl } from '@/lib/lightweight-charts/model/chart-model';
import { type SeriesDataItemTypeMap } from '@/lib/lightweight-charts/model/data-consumer';
import { type LocalizationOptions } from '@/lib/lightweight-charts/model/localization-options';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';
import { type TickMark } from '@/lib/lightweight-charts/model/tick-marks';
import { type TickMarkWeightValue, type TimeScalePoint } from '@/lib/lightweight-charts/model/time-data';
import { type TimeMark } from '@/lib/lightweight-charts/model/time-scale';

/**
 * Internal Horizontal Scale Item
 */
export type InternalHorzScaleItem = Nominal<unknown, 'InternalHorzScaleItem'>;

/**
 * Function for converting a horizontal scale item to an internal item.
 */
export type HorzScaleItemConverterToInternalObj<THorzScaleItem> = (time: THorzScaleItem) => InternalHorzScaleItem;

/**
 * Represents the type of data that a series contains.
 */
export type DataItem<THorzScaleItem> = SeriesDataItemTypeMap<THorzScaleItem>[SeriesType];

/**
 * Index key for a horizontal scale item.
 */
export type InternalHorzScaleItemKey = Nominal<number, 'InternalHorzScaleItemKey'>;

/**
 * Class interface for Horizontal scale behavior
 */
export type IHorzScaleBehavior<THorzScaleItem> = {
    /**
     * Structure describing options of the chart.
     *
     * @returns ChartOptionsBase
     */
    options(): ChartOptionsImpl<THorzScaleItem>;
    /**
     * Set the chart options. Note that this is different to `applyOptions` since the provided options will overwrite the current options
     * instead of merging with the current options.
     *
     * @param options - Chart options to be set
     * @returns void
     */
    setOptions(options: ChartOptionsImpl<THorzScaleItem>): void;
    /**
     * Method to preprocess the data.
     *
     * @param data - Data items for the series
     * @returns void
     */
    preprocessData(data: DataItem<THorzScaleItem> | DataItem<THorzScaleItem>[]): void;
    /**
     * Convert horizontal scale item into an internal horizontal scale item.
     *
     * @param item - item to be converted
     * @returns InternalHorzScaleItem
     */
    convertHorzItemToInternal(item: THorzScaleItem): InternalHorzScaleItem;
    /**
     * Creates and returns a converter for changing series data into internal horizontal scale items.
     *
     * @param data - series data
     * @returns HorzScaleItemConverterToInternalObj
     */
    createConverterToInternalObj(
        data: SeriesDataItemTypeMap<THorzScaleItem>[SeriesType][],
    ): HorzScaleItemConverterToInternalObj<THorzScaleItem>;
    /**
     * Returns the key for the specified horizontal scale item.
     *
     * @param internalItem - horizontal scale item for which the key should be returned
     * @returns InternalHorzScaleItemKey
     */
    key(internalItem: InternalHorzScaleItem | THorzScaleItem): InternalHorzScaleItemKey;
    /**
     * Returns the cache key for the specified horizontal scale item.
     *
     * @param internalItem - horizontal scale item for which the cache key should be returned
     * @returns number
     */
    cacheKey(internalItem: InternalHorzScaleItem): number;
    /**
     * Update the formatter with the localization options.
     *
     * @param options - Localization options
     * @returns void
     */
    updateFormatter(options: LocalizationOptions<THorzScaleItem>): void;
    /**
     * Format the horizontal scale item into a display string.
     *
     * @param item - horizontal scale item to be formatted as a string
     * @returns string
     */
    formatHorzItem(item: InternalHorzScaleItem): string;
    /**
     * Format the horizontal scale tickmark into a display string.
     *
     * @param item - tickmark item
     * @param localizationOptions - Localization options
     * @returns string
     */
    formatTickmark(item: TickMark, localizationOptions: LocalizationOptions<THorzScaleItem>): string;
    /**
     * Returns the maximum tickmark weight value for the specified tickmarks on the time scale.
     *
     * @param marks - Timescale tick marks
     * @returns TickMarkWeightValue
     */
    maxTickMarkWeight(marks: TimeMark[]): TickMarkWeightValue;
    /**
     * Fill the weights for the sorted time scale points.
     *
     * @param sortedTimePoints - sorted time scale points
     * @param startIndex - starting index
     * @returns void
     */
    fillWeightsForPoints(sortedTimePoints: readonly Mutable<TimeScalePoint>[], startIndex: number): void;

    /**
     * If returns true, then the tick mark formatter will be called for all the visible
     * tick marks even if the formatter has previously been called for a specific tick mark.
     * This allows you to change the formatting on all the tick marks.
     *
     * @param tickMarks - array of tick marks
     * @returns boolean
     */
    shouldResetTickmarkLabels?(tickMarks: readonly TickMark[]): boolean;
};
