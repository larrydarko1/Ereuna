/**
 * The chart's public surface, as a type.
 *
 * Split from the class so that `MouseEventParams` and the subscription signatures
 * can be imported without pulling in the implementation, which reaches most of the
 * model.
 */
import { type DeepPartial } from '@/lib/charting/engine/helpers/strict-type-checks';

import { type ChartOptionsImpl } from '@/lib/charting/engine/model/chart/chart-model';
import {
    type BarData,
    type HistogramData,
    type LineData,
    type WhitespaceData,
} from '@/lib/charting/engine/model/data/data-consumer';
import { type Time } from '@/lib/charting/engine/model/time/types';
import { type CustomData, type ICustomSeriesPaneView } from '@/lib/charting/engine/model/series/icustom-series';
import { type Point } from '@/lib/charting/engine/model/point';
import {
    type AreaSeriesPartialOptions,
    type BarSeriesPartialOptions,
    type BaselineSeriesPartialOptions,
    type CandlestickSeriesPartialOptions,
    type CustomSeriesOptions,
    type HistogramSeriesPartialOptions,
    type LineSeriesPartialOptions,
    type SeriesPartialOptions,
    type SeriesType,
} from '@/lib/charting/engine/model/series/series-options';
import { type Logical } from '@/lib/charting/engine/model/time/time-data';
import { type TouchMouseEventData } from '@/lib/charting/engine/model/chart/touch-mouse-event-data';

import { type IPriceScaleApi } from '@/lib/charting/engine/api/iprice-scale-api';
import { type ISeriesApi } from '@/lib/charting/engine/api/iseries-api';
import { type ITimeScaleApi } from '@/lib/charting/engine/api/itime-scale-api';

/**
 * Dimensions of the Chart Pane
 * (the main chart area which excludes the time and price scales).
 */
export type PaneSize = {
    /** Height of the Chart Pane (pixels) */
    height: number;
    /** Width of the Chart Pane (pixels) */
    width: number;
};

/**
 * Represents a mouse event.
 */
export type MouseEventParams<THorzScaleItem = Time> = {
    /**
     * Time of the data at the location of the mouse event.
     *
     * The value will be `undefined` if the location of the event in the chart is outside the range of available data.
     */
    time?: THorzScaleItem | undefined;
    /**
     * Logical index
     */
    logical?: Logical | undefined;
    /**
     * Location of the event in the chart.
     *
     * The value will be `undefined` if the event is fired outside the chart, for example a mouse leave event.
     */
    point?: Point | undefined;
    /**
     * Data of all series at the location of the event in the chart.
     *
     * Keys of the map are {@link ISeriesApi} instances. Values are prices.
     * Values of the map are original data items
     */
    seriesData: Map<
        ISeriesApi<SeriesType, THorzScaleItem>,
        BarData<THorzScaleItem> | LineData<THorzScaleItem> | HistogramData<THorzScaleItem> | CustomData<THorzScaleItem>
    >;
    /**
     * The {@link ISeriesApi} for the series at the point of the mouse event.
     */
    hoveredSeries?: ISeriesApi<SeriesType, THorzScaleItem> | undefined;
    /**
     * The ID of the object at the point of the mouse event.
     */
    hoveredObjectId?: unknown;
    /**
     * The underlying source mouse or touch event data, if available
     */
    sourceEvent?: TouchMouseEventData | undefined;
};

/**
 * A custom function use to handle mouse events.
 */
export type MouseEventHandler<THorzScaleItem> = (param: MouseEventParams<THorzScaleItem>) => void;

/**
 * The main interface of a single chart.
 */
export type IChartApiBase<THorzScaleItem = Time> = {
    /**
     * Removes the chart object including all DOM elements. This is an irreversible operation, you cannot do anything with the chart after removing it.
     */
    remove(): void;

    /**
     * Sets fixed size of the chart. By default chart takes up 100% of its container.
     *
     * If chart has the `autoSize` option enabled, and the ResizeObserver is available then
     * the width and height values will be ignored.
     *
     * @param width - Target width of the chart.
     * @param height - Target height of the chart.
     * @param forceRepaint - True to initiate resize immediately. One could need this to get screenshot immediately after resize.
     */
    resize(width: number, height: number): void;

    /**
     * Creates a custom series with specified parameters.
     *
     * A custom series is a generic series which can be extended with a custom renderer to
     * implement chart types which the library doesn't support by default.
     *
     * @param customPaneView - A custom series pane view which implements the custom renderer.
     * @param customOptions - Customization parameters of the series being created.
     * ```js
     * const series = chart.addCustomSeries(myCustomPaneView);
     * ```
     */
    addCustomSeries<
        TData extends CustomData<THorzScaleItem>,
        TOptions extends CustomSeriesOptions,
        TPartialOptions extends SeriesPartialOptions<TOptions> = SeriesPartialOptions<TOptions>,
    >(
        customPaneView: ICustomSeriesPaneView<THorzScaleItem, TData, TOptions>,
        customOptions?: SeriesPartialOptions<TOptions>,
    ): ISeriesApi<'Custom', THorzScaleItem, TData | WhitespaceData<THorzScaleItem>, TOptions, TPartialOptions>;

    /**
     * Creates an area series with specified parameters.
     *
     * @param areaOptions - Customization parameters of the series being created.
     * @returns An interface of the created series.
     * @example
     * ```js
     * const series = chart.addAreaSeries();
     * ```
     */
    addAreaSeries(areaOptions?: AreaSeriesPartialOptions): ISeriesApi<'Area', THorzScaleItem>;

    /**
     * Creates a baseline series with specified parameters.
     *
     * @param baselineOptions - Customization parameters of the series being created.
     * @returns An interface of the created series.
     * @example
     * ```js
     * const series = chart.addBaselineSeries();
     * ```
     */
    addBaselineSeries(baselineOptions?: BaselineSeriesPartialOptions): ISeriesApi<'Baseline', THorzScaleItem>;

    /**
     * Creates a bar series with specified parameters.
     *
     * @param barOptions - Customization parameters of the series being created.
     * @returns An interface of the created series.
     * @example
     * ```js
     * const series = chart.addBarSeries();
     * ```
     */
    addBarSeries(barOptions?: BarSeriesPartialOptions): ISeriesApi<'Bar', THorzScaleItem>;

    /**
     * Creates a candlestick series with specified parameters.
     *
     * @param candlestickOptions - Customization parameters of the series being created.
     * @returns An interface of the created series.
     * @example
     * ```js
     * const series = chart.addCandlestickSeries();
     * ```
     */
    addCandlestickSeries(
        candlestickOptions?: CandlestickSeriesPartialOptions,
    ): ISeriesApi<'Candlestick', THorzScaleItem>;

    /**
     * Creates a histogram series with specified parameters.
     *
     * @param histogramOptions - Customization parameters of the series being created.
     * @returns An interface of the created series.
     * @example
     * ```js
     * const series = chart.addHistogramSeries();
     * ```
     */
    addHistogramSeries(histogramOptions?: HistogramSeriesPartialOptions): ISeriesApi<'Histogram', THorzScaleItem>;

    /**
     * Creates a line series with specified parameters.
     *
     * @param lineOptions - Customization parameters of the series being created.
     * @returns An interface of the created series.
     * @example
     * ```js
     * const series = chart.addLineSeries();
     * ```
     */
    addLineSeries(lineOptions?: LineSeriesPartialOptions): ISeriesApi<'Line', THorzScaleItem>;

    /**
     * Removes a series of any type. This is an irreversible operation, you cannot do anything with the series after removing it.
     *
     * @example
     * ```js
     * chart.removeSeries(series);
     * ```
     */
    removeSeries(seriesApi: ISeriesApi<SeriesType, THorzScaleItem>): void;

    /**
     * Subscribe to the chart click event.
     *
     * @param handler - Handler to be called on mouse click.
     * @example
     * ```js
     * function myClickHandler(param) {
     *     if (!param.point) {
     *         return;
     *     }
     *
     *     console.log(`Click at ${param.point.x}, ${param.point.y}. The time is ${param.time}.`);
     * }
     *
     * chart.subscribeClick(myClickHandler);
     * ```
     */
    subscribeClick(handler: MouseEventHandler<THorzScaleItem>): void;

    /**
     * Unsubscribe a handler that was previously subscribed using {@link subscribeClick}.
     *
     * @param handler - Previously subscribed handler
     * @example
     * ```js
     * chart.unsubscribeClick(myClickHandler);
     * ```
     */
    unsubscribeClick(handler: MouseEventHandler<THorzScaleItem>): void;

    /**
     * Subscribe to the chart double-click event.
     *
     * @param handler - Handler to be called on mouse double-click.
     * @example
     * ```js
     * function myDblClickHandler(param) {
     *     if (!param.point) {
     *         return;
     *     }
     *
     *     console.log(`Double Click at ${param.point.x}, ${param.point.y}. The time is ${param.time}.`);
     * }
     *
     * chart.subscribeDblClick(myDblClickHandler);
     * ```
     */
    subscribeDblClick(handler: MouseEventHandler<THorzScaleItem>): void;

    /**
     * Unsubscribe a handler that was previously subscribed using {@link subscribeDblClick}.
     *
     * @param handler - Previously subscribed handler
     * @example
     * ```js
     * chart.unsubscribeDblClick(myDblClickHandler);
     * ```
     */
    unsubscribeDblClick(handler: MouseEventHandler<THorzScaleItem>): void;

    /**
     * Subscribe to the crosshair move event.
     *
     * @param handler - Handler to be called on crosshair move.
     * @example
     * ```js
     * function myCrosshairMoveHandler(param) {
     *     if (!param.point) {
     *         return;
     *     }
     *
     *     console.log(`Crosshair moved to ${param.point.x}, ${param.point.y}. The time is ${param.time}.`);
     * }
     *
     * chart.subscribeCrosshairMove(myCrosshairMoveHandler);
     * ```
     */
    subscribeCrosshairMove(handler: MouseEventHandler<THorzScaleItem>): void;

    /**
     * Unsubscribe a handler that was previously subscribed using {@link subscribeCrosshairMove}.
     *
     * @param handler - Previously subscribed handler
     * @example
     * ```js
     * chart.unsubscribeCrosshairMove(myCrosshairMoveHandler);
     * ```
     */
    unsubscribeCrosshairMove(handler: MouseEventHandler<THorzScaleItem>): void;

    /**
     * Returns API to manipulate a price scale.
     *
     * @param priceScaleId - ID of the price scale.
     * @returns Price scale API.
     */
    priceScale(priceScaleId: string): IPriceScaleApi;

    /**
     * Returns API to manipulate the time scale
     *
     * @returns Target API
     */
    timeScale(): ITimeScaleApi<THorzScaleItem>;

    /**
     * Applies new options to the chart
     *
     * @param options - Any subset of options.
     */
    applyOptions(options: DeepPartial<ChartOptionsImpl<THorzScaleItem>>): void;

    /**
     * Returns currently applied options
     *
     * @returns Full set of currently applied options, including defaults
     */
    options(): Readonly<ChartOptionsImpl<THorzScaleItem>>;

    /**
     * Make a screenshot of the chart with all the elements excluding crosshair.
     *
     * @returns A canvas with the chart drawn on. Any `Canvas` methods like `toDataURL()` or `toBlob()` can be used to serialize the result.
     */
    takeScreenshot(): HTMLCanvasElement;

    /**
     * Returns the active state of the `autoSize` option. This can be used to check
     * whether the chart is handling resizing automatically with a `ResizeObserver`.
     *
     * @returns Whether the `autoSize` option is enabled and the active.
     */
    autoSizeActive(): boolean;

    /**
     * Returns the generated div element containing the chart. This can be used for adding your own additional event listeners, or for measuring the
     * elements dimensions and position within the document.
     *
     * @returns generated div element containing the chart.
     */
    chartElement(): HTMLDivElement;

    /**
     * Set the crosshair position within the chart.
     *
     * Usually the crosshair position is set automatically by the user's actions. However in some cases you may want to set it explicitly.
     *
     * For example if you want to synchronise the crosshairs of two separate charts.
     *
     * @param price - The price (vertical coordinate) of the new crosshair position.
     * @param horizontalPosition - The horizontal coordinate (time by default) of the new crosshair position.
     */
    setCrosshairPosition(
        price: number,
        horizontalPosition: THorzScaleItem,
        seriesApi: ISeriesApi<SeriesType, THorzScaleItem>,
    ): void;

    /**
     * Clear the crosshair position within the chart.
     */
    clearCrosshairPosition(): void;

    /**
     * Returns the dimensions of the chart pane (the plot surface which excludes time and price scales).
     * This would typically only be useful for plugin development.
     *
     * @returns Dimensions of the chart pane
     */
    paneSize(): PaneSize;
};
