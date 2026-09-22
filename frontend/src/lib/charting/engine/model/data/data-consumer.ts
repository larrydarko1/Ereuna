/**
 * The data shapes a caller passes in, one per series type, and the guards that
 * tell a real point from a whitespace gap.
 *
 * A whitespace item reserves its slot on the time scale without drawing anything,
 * which is how a series shows a gap rather than a straight line across it.
 */
import { type CustomData, type CustomSeriesWhitespaceData } from '@/lib/charting/engine/model/series/icustom-series';
import { type Series } from '@/lib/charting/engine/model/series/series';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { type Time } from '@/lib/charting/engine/model/time/types';

/**
 * Represents a whitespace data item, which is a data point without a value.
 *
 * @example
 * ```js
 * const data = [
 *     { time: '2018-12-03', value: 27.02 },
 *     { time: '2018-12-04' }, // whitespace
 *     { time: '2018-12-05' }, // whitespace
 *     { time: '2018-12-06' }, // whitespace
 *     { time: '2018-12-07' }, // whitespace
 *     { time: '2018-12-08', value: 23.92 },
 *     { time: '2018-12-13', value: 30.74 },
 * ];
 * ```
 */
export type WhitespaceData<THorzScaleItem = Time> = {
    /**
     * The time of the data.
     */
    time: THorzScaleItem;

    /**
     * Additional custom values which will be ignored by the library, but
     * could be used by plugins.
     */
    customValues?: Record<string, unknown> | undefined;
};

/**
 * A base interface for a data point of single-value series.
 */
export type SingleValueData<THorzScaleItem = Time> = {
    /**
     * The time of the data.
     */
    time: THorzScaleItem;

    /**
     * Price value of the data.
     */
    value: number;
} & WhitespaceData<THorzScaleItem>;

/**
 * Structure describing a single item of data for line series
 */
export type LineData<THorzScaleItem = Time> = {
    /**
     * Optional color value for certain data item. If missed, color from options is used
     */
    color?: string;
} & SingleValueData<THorzScaleItem>;

/**
 * Structure describing a single item of data for histogram series
 */
export type HistogramData<THorzScaleItem = Time> = {
    /**
     * Optional color value for certain data item. If missed, color from options is used
     */
    color?: string;
} & SingleValueData<THorzScaleItem>;

/**
 * Structure describing a single item of data for area series
 */
export type AreaData<THorzScaleItem = Time> = {
    /**
     * Optional line color value for certain data item. If missed, color from options is used
     */
    lineColor?: string;

    /**
     * Optional top color value for certain data item. If missed, color from options is used
     */
    topColor?: string;

    /**
     * Optional bottom color value for certain data item. If missed, color from options is used
     */
    bottomColor?: string;
} & SingleValueData<THorzScaleItem>;

/**
 * Structure describing a single item of data for baseline series
 */
export type BaselineData<THorzScaleItem = Time> = {
    /**
     * Optional top area top fill color value for certain data item. If missed, color from options is used
     */
    topFillColor1?: string;

    /**
     * Optional top area bottom fill color value for certain data item. If missed, color from options is used
     */
    topFillColor2?: string;

    /**
     * Optional top area line color value for certain data item. If missed, color from options is used
     */
    topLineColor?: string;

    /**
     * Optional bottom area top fill color value for certain data item. If missed, color from options is used
     */
    bottomFillColor1?: string;

    /**
     * Optional bottom area bottom fill color value for certain data item. If missed, color from options is used
     */
    bottomFillColor2?: string;

    /**
     * Optional bottom area line color value for certain data item. If missed, color from options is used
     */
    bottomLineColor?: string;
} & SingleValueData<THorzScaleItem>;

/**
 * Represents a bar with a {@link Time} and open, high, low, and close prices.
 */
export type OhlcData<THorzScaleItem = Time> = {
    /**
     * The bar time.
     */
    time: THorzScaleItem;

    /**
     * The open price.
     */
    open: number;
    /**
     * The high price.
     */
    high: number;
    /**
     * The low price.
     */
    low: number;
    /**
     * The close price.
     */
    close: number;
} & WhitespaceData<THorzScaleItem>;

/**
 * Structure describing a single item of data for bar series
 */
export type BarData<THorzScaleItem = Time> = {
    /**
     * Optional color value for certain data item. If missed, color from options is used
     */
    color?: string;
} & OhlcData<THorzScaleItem>;

/**
 * Structure describing a single item of data for candlestick series
 */
export type CandlestickData<THorzScaleItem = Time> = {
    /**
     * Optional color value for certain data item. If missed, color from options is used
     */
    color?: string;
    /**
     * Optional border color value for certain data item. If missed, color from options is used
     */
    borderColor?: string;
    /**
     * Optional wick color value for certain data item. If missed, color from options is used
     */
    wickColor?: string;
} & OhlcData<THorzScaleItem>;

/**
 * Represents the type of data that a series contains.
 *
 * For example a bar series contains {@link BarData} or {@link WhitespaceData}.
 */
export type SeriesDataItemTypeMap<THorzScaleItem = Time> = {
    /**
     * The types of bar series data.
     */
    Bar: BarData<THorzScaleItem> | WhitespaceData<THorzScaleItem>;
    /**
     * The types of candlestick series data.
     */
    Candlestick: CandlestickData<THorzScaleItem> | WhitespaceData<THorzScaleItem>;
    /**
     * The types of area series data.
     */
    Area: AreaData<THorzScaleItem> | WhitespaceData<THorzScaleItem>;
    /**
     * The types of baseline series data.
     */
    Baseline: BaselineData<THorzScaleItem> | WhitespaceData<THorzScaleItem>;
    /**
     * The types of line series data.
     */
    Line: LineData<THorzScaleItem> | WhitespaceData<THorzScaleItem>;
    /**
     * The types of histogram series data.
     */
    Histogram: HistogramData<THorzScaleItem> | WhitespaceData<THorzScaleItem>;
    /**
     * The base types of an custom series data.
     */
    Custom: CustomData<THorzScaleItem> | CustomSeriesWhitespaceData<THorzScaleItem>;
};

export type DataUpdatesConsumer<TSeriesType extends SeriesType, THorzScaleItem = Time> = {
    applyNewData(series: Series<TSeriesType>, data: SeriesDataItemTypeMap<THorzScaleItem>[TSeriesType][]): void;
    updateData(series: Series<TSeriesType>, data: SeriesDataItemTypeMap<THorzScaleItem>[TSeriesType]): void;
};

export function isWhitespaceData<THorzScaleItem = Time>(
    data: SeriesDataItemTypeMap<THorzScaleItem>[SeriesType],
): data is WhitespaceData<THorzScaleItem> {
    return (
        (data as Partial<BarData<THorzScaleItem>>).open === undefined &&
        (data as Partial<LineData<THorzScaleItem>>).value === undefined
    );
}

export function isFulfilledData<THorzScaleItem, T extends SeriesDataItemTypeMap<THorzScaleItem>[SeriesType]>(
    data: T,
): data is Extract<T, BarData<THorzScaleItem> | LineData<THorzScaleItem> | HistogramData<THorzScaleItem>> {
    return (
        (data as Partial<BarData<THorzScaleItem>>).open !== undefined ||
        (data as Partial<LineData<THorzScaleItem>>).value !== undefined
    );
}
