/**
 * What a caller implements to draw a series type this library does not have.
 *
 * The view supplies the price values the scale should autoscale over, which is why
 * a custom series can share an axis with a built-in one.
 */
import { type CanvasRenderingTarget2D } from 'fancy-canvas';

import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type Time } from '@/lib/charting/engine/model/time/types';
import { type CustomSeriesOptions } from '@/lib/charting/engine/model/series/series-options';
import { type Range } from '@/lib/charting/engine/model/time/time-data';

/**
 * Represents a whitespace data item, which is a data point without a value.
 */
export type CustomSeriesWhitespaceData<THorzScaleItem> = {
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
 * TBase structure describing a single item of data for a custom series.
 *
 * This type allows for any properties to be defined
 * within the interface. It is recommended that you extend this interface with
 * the required data structure.
 */
export type CustomData<THorzScaleItem = Time> = {
    /**
     * If defined then this color will be used for the price line and price scale line
     * for this specific data item of the custom series.
     */
    color?: string;
} & CustomSeriesWhitespaceData<THorzScaleItem>;

export type WhitespaceCheck<THorzScaleItem, TData extends CustomData<THorzScaleItem> = CustomData<THorzScaleItem>> = (
    bar: TData | CustomSeriesWhitespaceData<THorzScaleItem>,
) => bar is CustomSeriesWhitespaceData<THorzScaleItem>;

/**
 * Renderer data for an item within the custom series.
 */
export type CustomBarItemData<THorzScaleItem, TData extends CustomData<THorzScaleItem> = CustomData<THorzScaleItem>> = {
    /**
     * Horizontal coordinate for the item. Measured from the left edge of the pane in pixels.
     */
    x: number;
    /**
     * Time scale index for the item. This isn't the timestamp but rather the logical index.
     */
    time: number;
    /**
     * Original data for the item.
     */
    originalData: TData;
    /**
     * Color assigned for the item, typically used for price line and price scale label.
     */
    barColor: string;
};

/**
 * Data provide to the custom series pane view which can be used within the renderer
 * for drawing the series data.
 */
type PaneRendererCustomData<THorzScaleItem, TData extends CustomData<THorzScaleItem>> = {
    /**
     * List of all the series' items and their x coordinates.
     */
    bars: readonly CustomBarItemData<THorzScaleItem, TData>[];
    /**
     * Spacing between consecutive bars.
     */
    barSpacing: number;
    /**
     * The current visible range of items on the chart.
     */
    visibleRange: Range<number> | null;
};

/**
 * Converter function for changing prices into vertical coordinate values.
 *
 * This is provided as a convenience function since the series original data will most likely be defined
 * in price values, and the renderer needs to draw with coordinates. This returns the same values as
 * directly using the series' priceToCoordinate method.
 */
export type PriceToCoordinateConverter = (price: number) => Coordinate | null;

/**
 * Renderer for the custom series. This paints on the main chart pane.
 */
export type ICustomSeriesPaneRenderer = {
    /**
     * Draw function for the renderer.
     *
     * @param target - canvas context to draw on, refer to FancyCanvas library for more details about this class.
     * @param priceConverter - converter function for changing prices into vertical coordinate values.
     * @param isHovered - Whether the series is hovered.
     * @param hitTestData - Optional hit test data for the series.
     */
    draw(
        target: CanvasRenderingTarget2D,
        priceConverter: PriceToCoordinateConverter,
        isHovered: boolean,
        hitTestData?: unknown,
    ): void;
};

/**
 * Price values for the custom series. This list should include the largest, smallest, and current price values for the data point.
 * The last value in the array will be used for the current value. You shouldn't need to
 * have more than 3 values in this array since the library only needs a largest, smallest, and current value.
 *
 * Examples:
 * - For a line series, this would contain a single number representing the current value.
 * - For a candle series, this would contain the high, low, and close values. Where the last value would be the close value.
 */
export type CustomSeriesPricePlotValues = number[];

/**
 * This interface represents the view for the custom series
 */
export type ICustomSeriesPaneView<
    THorzScaleItem = Time,
    TData extends CustomData<THorzScaleItem> = CustomData<THorzScaleItem>,
    TSeriesOptions extends CustomSeriesOptions = CustomSeriesOptions,
> = {
    /**
     * This method returns a renderer - special object to draw data for the series
     * on the main chart pane.
     *
     * @returns an renderer object to be used for drawing.
     */
    renderer(): ICustomSeriesPaneRenderer;

    /**
     * This method will be called with the latest data for the renderer to use
     * during the next paint.
     */
    update(data: PaneRendererCustomData<THorzScaleItem, TData>, seriesOptions: TSeriesOptions): void;

    /**
     * A function for interpreting the custom series data and returning an array of numbers
     * representing the price values for the item. These price values are used
     * by the chart to determine the auto-scaling (to ensure the items are in view) and the crosshair
     * and price line positions. The last value in the array will be used as the current value. You shouldn't need to
     * have more than 3 values in this array since the library only needs a largest, smallest, and current value.
     */
    priceValueBuilder(plotRow: TData): CustomSeriesPricePlotValues;

    /**
     * A function for testing whether a data point should be considered fully specified, or if it should
     * be considered as whitespace. Should return `true` if is whitespace.
     *
     * @param data - data point to be tested
     */
    isWhitespace(
        data: TData | CustomSeriesWhitespaceData<THorzScaleItem>,
    ): data is CustomSeriesWhitespaceData<THorzScaleItem>;

    /**
     * Default options
     */
    defaultOptions(): TSeriesOptions;

    /**
     * This method will be evoked when the series has been removed from the chart. This method should be used to
     * clean up any objects, references, and other items that could potentially cause memory leaks.
     *
     * This method should contain all the necessary code to clean up the object before it is removed from memory.
     * This includes removing any event listeners or timers that are attached to the object, removing any references
     * to other objects, and resetting any values or properties that were modified during the lifetime of the object.
     */
    destroy?(): void;
};
