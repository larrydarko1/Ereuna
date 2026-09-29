/**
 * The chart's options: what a caller may pass to createChart() and applyOptions(),
 * and the internal shape ChartModel keeps after defaults are merged in. Kept apart
 * from the model, as layout-options.ts and crosshair-options.ts are, so a module
 * that only reads an option does not have to load the model to name its type.
 */
import { type CrosshairOptions } from '@/lib/charting/engine/model/chart/crosshair-options';
import { type GridOptions } from '@/lib/charting/engine/model/chart/grid';
import { type LayoutOptions } from '@/lib/charting/engine/model/chart/layout-options';
import {
    type LocalizationOptions,
    type LocalizationOptionsBase,
} from '@/lib/charting/engine/model/chart/localization-options';
import { type WatermarkOptions } from '@/lib/charting/engine/model/chart/watermark';
import { type PriceScaleOptions } from '@/lib/charting/engine/model/price/price-scale';
import { type HorzScaleOptions } from '@/lib/charting/engine/model/time/time-scale';

/**
 * Represents options for how the chart is scrolled by the mouse and touch gestures.
 */
type HandleScrollOptions = {
    /**
     * Enable scrolling with the mouse wheel.
     *
     * @defaultValue `true`
     */
    mouseWheel: boolean;

    /**
     * Enable scrolling by holding down the left mouse button and moving the mouse.
     *
     * @defaultValue `true`
     */
    pressedMouseMove: boolean;

    /**
     * Enable horizontal touch scrolling.
     *
     * When enabled the chart handles touch gestures that would normally scroll the webpage horizontally.
     *
     * @defaultValue `true`
     */
    horzTouchDrag: boolean;

    /**
     * Enable vertical touch scrolling.
     *
     * When enabled the chart handles touch gestures that would normally scroll the webpage vertically.
     *
     * @defaultValue `true`
     */
    vertTouchDrag: boolean;
};

/**
 * Represents options for how the chart is scaled by the mouse and touch gestures.
 */
type HandleScaleOptions = {
    /**
     * Enable scaling with the mouse wheel.
     *
     * @defaultValue `true`
     */
    mouseWheel: boolean;

    /**
     * Enable scaling with pinch/zoom gestures.
     *
     * @defaultValue `true`
     */
    pinch: boolean;

    /**
     * Enable scaling the price and/or time scales by holding down the left mouse button and moving the mouse.
     */
    axisPressedMouseMove: AxisPressedMouseMoveOptions | boolean;

    /**
     * Enable resetting scaling by double-clicking the left mouse button.
     */
    axisDoubleClickReset: AxisDoubleClickOptions | boolean;
};

/**
 * Represents options for enabling or disabling kinetic scrolling with mouse and touch gestures.
 */
type KineticScrollOptions = {
    /**
     * Enable kinetic scroll with touch gestures.
     *
     * @defaultValue `true`
     */
    touch: boolean;

    /**
     * Enable kinetic scroll with the mouse.
     *
     * @defaultValue `false`
     */
    mouse: boolean;
};

type HandleScaleOptionsInternal = Omit<HandleScaleOptions, 'axisPressedMouseMove' | 'axisDoubleClickReset'> & {
    /** @public */
    axisPressedMouseMove: AxisPressedMouseMoveOptions;

    /** @public */
    axisDoubleClickReset: AxisDoubleClickOptions;
};

/**
 * Represents options for how the time and price axes react to mouse movements.
 */
type AxisPressedMouseMoveOptions = {
    /**
     * Enable scaling the time axis by holding down the left mouse button and moving the mouse.
     *
     * @defaultValue `true`
     */
    time: boolean;

    /**
     * Enable scaling the price axis by holding down the left mouse button and moving the mouse.
     *
     * @defaultValue `true`
     */
    price: boolean;
};

/**
 * Represents options for how the time and price axes react to mouse double click.
 */
type AxisDoubleClickOptions = {
    /**
     * Enable resetting scaling the time axis by double-clicking the left mouse button.
     *
     * @defaultValue `true`
     */
    time: boolean;

    /**
     * Enable reseting scaling the price axis by by double-clicking the left mouse button.
     *
     * @defaultValue `true`
     */
    price: boolean;
};

/**
 * Represents a visible price scale's options.
 *
 * @see {@link PriceScaleOptions}
 */
export type VisiblePriceScaleOptions = PriceScaleOptions;

/**
 * Represents overlay price scale options.
 */
export type OverlayPriceScaleOptions = Omit<PriceScaleOptions, 'visible' | 'autoScale'>;

export type TrackingModeExitMode = (typeof TrackingModeExitMode)[keyof typeof TrackingModeExitMode];

/**
 * Represent options for the tracking mode's behavior.
 *
 * Mobile users will not have the ability to see the values/dates like they do on desktop.
 * To see it, they should enter the tracking mode. The tracking mode will deactivate the scrolling
 * and make it possible to check values and dates.
 */
type TrackingModeOptions = {
    /** @inheritDoc TrackingModeExitMode
     *
     * @defaultValue {@link TrackingModeExitMode.OnNextTap}
     */
    exitMode: TrackingModeExitMode;
};

/**
 * Represents common chart options
 */
export type ChartOptionsBase = {
    /**
     * Width of the chart in pixels
     *
     * @defaultValue If `0` (default) or none value provided, then a size of the widget will be calculated based its container's size.
     */
    width: number;

    /**
     * Height of the chart in pixels
     *
     * @defaultValue If `0` (default) or none value provided, then a size of the widget will be calculated based its container's size.
     */
    height: number;

    /**
     * Setting this flag to `true` will make the chart watch the chart container's size and automatically resize the chart to fit its container whenever the size changes.
     *
     * This feature requires [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) class to be available in the global scope.
     * Note that calling code is responsible for providing a polyfill if required. If the global scope does not have `ResizeObserver`, a warning will appear and the flag will be ignored.
     *
     * Please pay attention that `autoSize` option and explicit sizes options `width` and `height` don't conflict with one another.
     * If you specify `autoSize` flag, then `width` and `height` options will be ignored unless `ResizeObserver` has failed. If it fails then the values will be used as fallback.
     *
     * The flag `autoSize` could also be set with and unset with `applyOptions` function.
     * ```js
     * const chart = LightweightCharts.createChart(document.body, {
     *     autoSize: true,
     * });
     * ```
     */
    autoSize: boolean;

    /**
     * Watermark options.
     *
     * A watermark is a background label that includes a brief description of the drawn data. Any text can be added to it.
     *
     * Please make sure you enable it and set an appropriate font color and size to make your watermark visible in the background of the chart.
     * We recommend a semi-transparent color and a large font. Also note that watermark position can be aligned vertically and horizontally.
     */
    watermark: WatermarkOptions;

    /**
     * Layout options
     */
    layout: LayoutOptions;

    /**
     * Left price scale options
     */
    leftPriceScale: VisiblePriceScaleOptions;
    /**
     * Right price scale options
     */
    rightPriceScale: VisiblePriceScaleOptions;
    /**
     * Overlay price scale options
     */
    overlayPriceScales: OverlayPriceScaleOptions;

    /**
     * Time scale options
     */
    timeScale: HorzScaleOptions;

    /**
     * The crosshair shows the intersection of the price and time scale values at any point on the chart.
     *
     */
    crosshair: CrosshairOptions;

    /**
     * A grid is represented in the chart background as a vertical and horizontal lines drawn at the levels of visible marks of price and the time scales.
     */
    grid: GridOptions;

    /**
     * Scroll options, or a boolean flag that enables/disables scrolling
     */
    handleScroll: HandleScrollOptions | boolean;

    /**
     * Scale options, or a boolean flag that enables/disables scaling
     */
    handleScale: HandleScaleOptions | boolean;

    /**
     * Kinetic scroll options
     */
    kineticScroll: KineticScrollOptions;

    /** @inheritDoc TrackingModeOptions
     */
    trackingMode: TrackingModeOptions;

    /**
     * Basic localization options
     */
    localization: LocalizationOptionsBase;
};

/**
 * Structure describing options of the chart. Series options are to be set separately
 */
export type ChartOptionsImpl<THorzScaleItem> = {
    /**
     * Localization options.
     */
    localization: LocalizationOptions<THorzScaleItem>;
} & ChartOptionsBase;

export type ChartOptionsInternalBase = Omit<ChartOptionsBase, 'handleScroll' | 'handleScale' | 'layout'> & {
    /** @public */
    handleScroll: HandleScrollOptions;
    /** @public */
    handleScale: HandleScaleOptionsInternal;
    /** @public */
    layout: LayoutOptions;
};

export type ChartOptionsInternal<THorzScaleItem> = Omit<
    ChartOptionsImpl<THorzScaleItem>,
    'handleScroll' | 'handleScale' | 'layout'
> & {
    /** @public */
    handleScroll: HandleScrollOptions;
    /** @public */
    handleScale: HandleScaleOptionsInternal;
    /** @public */
    layout: LayoutOptions;
};

/**
 * Determine how to exit the tracking mode.
 *
 * By default, mobile users will long press to deactivate the scroll and have the ability to check values and dates.
 * Another press is required to activate the scroll, be able to move left/right, zoom, etc.
 */
export const TrackingModeExitMode = {
    /**
     * Tracking Mode will be deactivated on touch end event.
     */
    OnTouchEnd: 0,
    /**
     * Tracking Mode will be deactivated on the next tap event.
     */
    OnNextTap: 1,
} as const;
