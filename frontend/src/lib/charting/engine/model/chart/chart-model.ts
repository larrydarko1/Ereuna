/**
 * The chart, with no DOM in it.
 *
 * It owns the panes, the crosshair, the time scale and the options, and every
 * change to any of them is reported as an invalidation rather than a repaint — the
 * widgets decide when to act on those, which is what keeps a burst of updates to
 * one frame.
 */
import { assert, getDefined, getNotNull } from '@/lib/charting/engine/helpers/assertions';
import { gradientColorAtPercent } from '@/lib/charting/engine/helpers/color';
import { Delegate } from '@/lib/charting/engine/helpers/delegate';
import { type IDestroyable } from '@/lib/charting/engine/helpers/idestroyable';
import { type ISubscription } from '@/lib/charting/engine/helpers/isubscription';
import { type DeepPartial, merge } from '@/lib/charting/engine/helpers/strict-type-checks';
import { Crosshair, type CrosshairOptions } from '@/lib/charting/engine/model/chart/crosshair';
import { type GridOptions } from '@/lib/charting/engine/model/chart/grid';
import {
    InvalidateMask,
    InvalidationLevel,
    type ITimeScaleAnimation,
} from '@/lib/charting/engine/model/chart/invalidate-mask';
import { ColorType, type LayoutOptions } from '@/lib/charting/engine/model/chart/layout-options';
import {
    type LocalizationOptions,
    type LocalizationOptionsBase,
} from '@/lib/charting/engine/model/chart/localization-options';
import { Magnet } from '@/lib/charting/engine/model/chart/magnet';
import { DEFAULT_STRETCH_FACTOR, Pane } from '@/lib/charting/engine/model/chart/pane';
import { type TouchMouseEventData } from '@/lib/charting/engine/model/chart/touch-mouse-event-data';
import { Watermark, type WatermarkOptions } from '@/lib/charting/engine/model/chart/watermark';
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type TimeScaleChanges } from '@/lib/charting/engine/model/data/data-layer';
import { type Point } from '@/lib/charting/engine/model/point';
import { DefaultPriceScaleId, isDefaultPriceScale } from '@/lib/charting/engine/model/price/default-price-scale';
import { type IPriceDataSource } from '@/lib/charting/engine/model/price/iprice-data-source';
import { type PriceScale, type PriceScaleOptions } from '@/lib/charting/engine/model/price/price-scale';
import { type ICustomSeriesPaneView } from '@/lib/charting/engine/model/series/icustom-series';
import { type ISeries, Series, type SeriesOptionsInternal } from '@/lib/charting/engine/model/series/series';
import { type SeriesOptionsMap, type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import {
    type IHorzScaleBehavior,
    type InternalHorzScaleItem,
} from '@/lib/charting/engine/model/time/ihorz-scale-behavior';
import { type LogicalRange, type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';
import { type HorzScaleOptions, type ITimeScale, TimeScale } from '@/lib/charting/engine/model/time/time-scale';
import { type PriceAxisViewRendererOptions } from '@/lib/charting/engine/renderers/iprice-axis-view-renderer';
import { PriceAxisRendererOptionsProvider } from '@/lib/charting/engine/renderers/price-axis-renderer-options-provider';

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

export type HoveredObject = {
    hitTestData?: unknown;
    externalId?: string | undefined;
};

export type HoveredSource = {
    source: IPriceDataSource;
    object?: HoveredObject | undefined;
};

export type PriceScaleOnPane = {
    priceScale: PriceScale;
    pane: Pane;
};

type BackgroundColorSide = (typeof BackgroundColorSide)[keyof typeof BackgroundColorSide];

type InvalidateHandler = (mask: InvalidateMask) => void;

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

type GradientColorsCache = {
    topColor: string;
    bottomColor: string;
    colors: Map<number, string>;
};

export type IChartModelBase = {
    applyPriceScaleOptions(priceScaleId: string, options: DeepPartial<PriceScaleOptions>): void;
    findPriceScale(priceScaleId: string): PriceScaleOnPane | null;
    options(): Readonly<ChartOptionsInternalBase>;
    timeScale(): ITimeScale;
    serieses(): readonly ISeries<SeriesType>[];

    updateSource(source: IPriceDataSource): void;
    updateCrosshair(): void;
    cursorUpdate(): void;
    clearCurrentPosition(): void;
    moveCrosshairTo(move: CrosshairMove): void;

    recalculatePane(pane: Pane | null): void;

    lightUpdate(): void;
    fullUpdate(): void;

    backgroundBottomColor(): string;
    backgroundTopColor(): string;
    backgroundColorAtYPercentFromTop(percent: number): string;

    paneForSource(source: IPriceDataSource): Pane | null;
    moveSeriesToScale(series: ISeries<SeriesType>, targetScaleId: string): void;

    priceAxisRendererOptions(): Readonly<PriceAxisViewRendererOptions>;
    rendererOptionsProvider(): PriceAxisRendererOptionsProvider;

    priceScalesOptionsChanged(): ISubscription;

    hoveredSource(): HoveredSource | null;
    setHoveredSource(source: HoveredSource | null): void;

    crosshairSource(): Crosshair;
    watermarkSource(): Watermark;

    startScrollPrice(pane: Pane, priceScale: PriceScale, x: number): void;
    scrollPriceTo(pane: Pane, priceScale: PriceScale, x: number): void;
    endScrollPrice(pane: Pane, priceScale: PriceScale): void;
    resetPriceScale(pane: Pane, priceScale: PriceScale): void;

    startScalePrice(pane: Pane, priceScale: PriceScale, x: number): void;
    scalePriceTo(pane: Pane, priceScale: PriceScale, x: number): void;
    endScalePrice(pane: Pane, priceScale: PriceScale): void;

    zoomTime(pointX: Coordinate, scale: number): void;
    startScrollTime(x: Coordinate): void;
    scrollTimeTo(x: Coordinate): void;
    endScrollTime(): void;

    setTimeScaleAnimation(animation: ITimeScaleAnimation): void;

    stopTimeScaleAnimation(): void;
};

/** One move of the crosshair, as `moveCrosshairTo` takes it. */
export type CrosshairMove = {
    x: Coordinate;
    y: Coordinate;
    pane: Pane;
    event: TouchMouseEventData | null;

    // Set when the move did not come from a pointer, so no crosshairMoved event
    // is raised — a subscriber would otherwise see its own programmatic call
    // arrive as if it were user input
    silent?: boolean;
};

const BackgroundColorSide = {
    Top: 0,
    Bottom: 1,
} as const;

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

export class ChartModel<THorzScaleItem> implements IDestroyable, IChartModelBase {
    private readonly _options: ChartOptionsInternal<THorzScaleItem>;
    private readonly _invalidateHandler: InvalidateHandler;

    private readonly _rendererOptionsProvider: PriceAxisRendererOptionsProvider;

    private readonly _timeScale: TimeScale<THorzScaleItem>;
    private readonly _panes: Pane[] = [];
    private readonly _crosshair: Crosshair;
    private readonly _magnet: Magnet;
    private readonly _watermark: Watermark;

    private _serieses: Series<SeriesType>[] = [];

    private _width = 0;
    private _hoveredSource: HoveredSource | null = null;
    private readonly _priceScalesOptionsChanged: Delegate = new Delegate();
    private _crosshairMoved = new Delegate<TimePointIndex | null, Point | null, TouchMouseEventData | null>();

    private _backgroundTopColor: string;
    private _backgroundBottomColor: string;
    private _gradientColorsCache: GradientColorsCache | null = null;

    private readonly _horzScaleBehavior: IHorzScaleBehavior<THorzScaleItem>;

    public constructor(
        invalidateHandler: InvalidateHandler,
        options: ChartOptionsInternal<THorzScaleItem>,
        horzScaleBehavior: IHorzScaleBehavior<THorzScaleItem>,
    ) {
        this._invalidateHandler = invalidateHandler;
        this._options = options;
        this._horzScaleBehavior = horzScaleBehavior;

        this._rendererOptionsProvider = new PriceAxisRendererOptionsProvider(this);

        this._timeScale = new TimeScale(this, options.timeScale, this._options.localization, horzScaleBehavior);
        this._crosshair = new Crosshair(this, options.crosshair);
        this._magnet = new Magnet(options.crosshair);
        this._watermark = new Watermark(this, options.watermark);

        this.createPane();
        getDefined(this._panes[0]).setStretchFactor(DEFAULT_STRETCH_FACTOR * 2);

        this._backgroundTopColor = this._getBackgroundColor(BackgroundColorSide.Top);
        this._backgroundBottomColor = this._getBackgroundColor(BackgroundColorSide.Bottom);
    }

    public fullUpdate(): void {
        this._invalidate(InvalidateMask.full());
    }

    public lightUpdate(): void {
        this._invalidate(InvalidateMask.light());
    }

    public cursorUpdate(): void {
        this._invalidate(new InvalidateMask(InvalidationLevel.Cursor));
    }

    public updateSource(source: IPriceDataSource): void {
        const inv = this._invalidationMaskForSource(source);
        this._invalidate(inv);
    }

    public hoveredSource(): HoveredSource | null {
        return this._hoveredSource;
    }

    public setHoveredSource(source: HoveredSource | null): void {
        const prevSource = this._hoveredSource;
        this._hoveredSource = source;
        if (prevSource !== null) {
            this.updateSource(prevSource.source);
        }
        if (source !== null) {
            this.updateSource(source.source);
        }
    }

    public options(): Readonly<ChartOptionsInternal<THorzScaleItem>> {
        return this._options;
    }

    public applyOptions(options: DeepPartial<ChartOptionsInternal<THorzScaleItem>>): void {
        merge(this._options, options);

        this._panes.forEach((p: Pane) => p.applyScaleOptions(options));

        if (options.timeScale !== undefined) {
            this._timeScale.applyOptions(options.timeScale);
        }

        if (options.localization !== undefined) {
            this._timeScale.applyLocalizationOptions(options.localization);
        }

        if (options.leftPriceScale !== undefined || options.rightPriceScale !== undefined) {
            this._priceScalesOptionsChanged.fire();
        }

        this._backgroundTopColor = this._getBackgroundColor(BackgroundColorSide.Top);
        this._backgroundBottomColor = this._getBackgroundColor(BackgroundColorSide.Bottom);

        this.fullUpdate();
    }

    public applyPriceScaleOptions(priceScaleId: string, options: DeepPartial<PriceScaleOptions>): void {
        if (priceScaleId === DefaultPriceScaleId.Left) {
            this.applyOptions({
                leftPriceScale: options,
            });
            return;
        }
        if (priceScaleId === DefaultPriceScaleId.Right) {
            this.applyOptions({
                rightPriceScale: options,
            });
            return;
        }

        const res = this.findPriceScale(priceScaleId);

        // Upstream threw here in development builds and returned silently in
        // production. An unknown id is a mistake at the call site either way,
        // and swallowing it applies none of the options the caller asked for
        if (res === null) {
            throw new Error(`Trying to apply price scale options with incorrect ID: ${priceScaleId}`);
        }

        res.priceScale.applyOptions(options);
        this._priceScalesOptionsChanged.fire();
    }

    public findPriceScale(priceScaleId: string): PriceScaleOnPane | null {
        for (const pane of this._panes) {
            const priceScale = pane.priceScaleById(priceScaleId);
            if (priceScale !== null) {
                return {
                    pane,
                    priceScale,
                };
            }
        }
        return null;
    }

    public timeScale(): TimeScale<THorzScaleItem> {
        return this._timeScale;
    }

    public panes(): readonly Pane[] {
        return this._panes;
    }

    public watermarkSource(): Watermark {
        return this._watermark;
    }

    public crosshairSource(): Crosshair {
        return this._crosshair;
    }

    public crosshairMoved(): ISubscription<TimePointIndex | null, Point | null, TouchMouseEventData | null> {
        return this._crosshairMoved;
    }

    public setPaneHeight(pane: Pane, height: number): void {
        pane.setHeight(height);
        this.recalculateAllPanes();
    }

    public setWidth(width: number): void {
        this._width = width;
        this._timeScale.setWidth(this._width);
        this._panes.forEach((pane: Pane) => pane.setWidth(width));
        this.recalculateAllPanes();
    }

    public createPane(index?: number): Pane {
        const pane = new Pane(this._timeScale, this);

        if (index !== undefined) {
            this._panes.splice(index, 0, pane);
        } else {
            // adding to the end - common case
            this._panes.push(pane);
        }

        const actualIndex = index === undefined ? this._panes.length - 1 : index;

        // we always do autoscaling on the creation
        // if autoscale option is true, it is ok, just recalculate by invalidation mask
        // if autoscale option is false, autoscale anyway on the first draw
        // also there is a scenario when autoscale is true in constructor and false later on applyOptions
        const mask = InvalidateMask.full();
        mask.invalidatePane(actualIndex, {
            level: InvalidationLevel.None,
            autoScale: true,
        });
        this._invalidate(mask);

        return pane;
    }

    public startScalePrice(pane: Pane, priceScale: PriceScale, x: number): void {
        pane.startScalePrice(priceScale, x);
    }

    public scalePriceTo(pane: Pane, priceScale: PriceScale, x: number): void {
        pane.scalePriceTo(priceScale, x);
        this.updateCrosshair();
        this._invalidate(this._paneInvalidationMask(pane, InvalidationLevel.Light));
    }

    public endScalePrice(pane: Pane, priceScale: PriceScale): void {
        pane.endScalePrice(priceScale);
        this._invalidate(this._paneInvalidationMask(pane, InvalidationLevel.Light));
    }

    public startScrollPrice(pane: Pane, priceScale: PriceScale, x: number): void {
        if (priceScale.isAutoScale()) {
            return;
        }
        pane.startScrollPrice(priceScale, x);
    }

    public scrollPriceTo(pane: Pane, priceScale: PriceScale, x: number): void {
        if (priceScale.isAutoScale()) {
            return;
        }
        pane.scrollPriceTo(priceScale, x);
        this.updateCrosshair();
        this._invalidate(this._paneInvalidationMask(pane, InvalidationLevel.Light));
    }

    public endScrollPrice(pane: Pane, priceScale: PriceScale): void {
        if (priceScale.isAutoScale()) {
            return;
        }
        pane.endScrollPrice(priceScale);
        this._invalidate(this._paneInvalidationMask(pane, InvalidationLevel.Light));
    }

    public resetPriceScale(pane: Pane, priceScale: PriceScale): void {
        pane.resetPriceScale(priceScale);
        this._invalidate(this._paneInvalidationMask(pane, InvalidationLevel.Light));
    }

    public startScaleTime(position: Coordinate): void {
        this._timeScale.startScale(position);
    }

    /**
     * Zoom in/out the chart (depends on scale value).
     *
     * @param pointX - X coordinate of the point to apply the zoom (the point which should stay on its place)
     * @param scale - Zoom value. Negative value means zoom out, positive - zoom in.
     */
    public zoomTime(pointX: Coordinate, scale: number): void {
        const timeScale = this.timeScale();
        if (timeScale.isEmpty() || scale === 0) {
            return;
        }

        const timeScaleWidth = timeScale.width();
        pointX = Math.max(1, Math.min(pointX, timeScaleWidth)) as Coordinate;

        timeScale.zoom(pointX, scale);

        this.recalculateAllPanes();
    }

    public scrollChart(x: Coordinate): void {
        this.startScrollTime(0 as Coordinate);
        this.scrollTimeTo(x);
        this.endScrollTime();
    }

    public scaleTimeTo(x: Coordinate): void {
        this._timeScale.scaleTo(x);
        this.recalculateAllPanes();
    }

    public endScaleTime(): void {
        this._timeScale.endScale();
        this.lightUpdate();
    }

    public startScrollTime(x: Coordinate): void {
        this._timeScale.startScroll(x);
    }

    public scrollTimeTo(x: Coordinate): void {
        this._timeScale.scrollTo(x);
        this.recalculateAllPanes();
    }

    public endScrollTime(): void {
        this._timeScale.endScroll();
        this.lightUpdate();
    }

    public serieses(): readonly Series<SeriesType>[] {
        return this._serieses;
    }

    /**
     * Moves the crosshair to a point on a pane, recording where it came from so
     * that a later magnet re-alignment can work from the raw coordinate rather
     * than the snapped one.
     */
    public moveCrosshairTo(move: CrosshairMove): void {
        const { x, y, pane, event } = move;

        this._crosshair.saveOriginCoord(x, y);
        let price = NaN;
        let index = this._timeScale.coordinateToIndex(x);

        const visibleBars = this._timeScale.visibleStrictRange();
        if (visibleBars !== null) {
            index = Math.min(Math.max(visibleBars.left(), index), visibleBars.right()) as TimePointIndex;
        }

        const priceScale = pane.defaultPriceScale();
        const firstValue = priceScale.firstValue();
        if (firstValue !== null) {
            price = priceScale.coordinateToPrice(y, firstValue);
        }
        price = this._magnet.align(price, index, pane);

        this._crosshair.setPosition(index, price, pane);

        this.cursorUpdate();
        if (move.silent !== true) {
            this._crosshairMoved.fire(this._crosshair.appliedIndex(), { x, y }, event);
        }
    }

    /**
     * Puts the crosshair on a price and a time rather than on a coordinate —
     * this is the path for a caller placing it deliberately, not for a pointer.
     */
    public placeCrosshairAt(price: number, horizontalPosition: THorzScaleItem, pane: Pane): void {
        const priceScale = pane.defaultPriceScale();
        const firstValue = priceScale.firstValue();
        const coordinateY = priceScale.priceToCoordinate(price, getNotNull(firstValue));
        const index = this._timeScale.timeToNearestIndex(horizontalPosition as InternalHorzScaleItem);
        const coordinateX = this._timeScale.indexToCoordinate(getNotNull(index));

        this.moveCrosshairTo({ x: coordinateX, y: coordinateY, pane, event: null, silent: true });
    }

    public clearCurrentPosition(skipEvent?: boolean): void {
        const crosshair = this.crosshairSource();
        crosshair.clearPosition();
        this.cursorUpdate();
        if (skipEvent !== true) {
            this._crosshairMoved.fire(null, null, null);
        }
    }

    public updateCrosshair(): void {
        // apply magnet
        const pane = this._crosshair.pane();
        if (pane !== null) {
            this.moveCrosshairTo({
                x: this._crosshair.originCoordX(),
                y: this._crosshair.originCoordY(),
                pane,
                event: null,
            });
        }

        this._crosshair.updateAllViews();
    }

    public updateTimeScale(changes: TimeScaleChanges): void {
        const { baseIndex: newBaseIndex, points: newPoints, firstChangedPointIndex } = changes;
        const oldFirstTime = this._timeScale.indexToTime(0 as TimePointIndex);

        if (newPoints !== undefined && firstChangedPointIndex !== undefined) {
            this._timeScale.update(newPoints, firstChangedPointIndex);
        }

        const newFirstTime = this._timeScale.indexToTime(0 as TimePointIndex);

        const currentBaseIndex = this._timeScale.baseIndex();
        const visibleBars = this._timeScale.visibleStrictRange();

        // if time scale cannot return current visible bars range (e.g. time scale has zero-width)
        // then we do not need to update right offset to shift visible bars range to have the same right offset as we have before new bar
        // (and actually we cannot)
        if (visibleBars !== null && oldFirstTime !== null && newFirstTime !== null) {
            const isLastSeriesBarVisible = visibleBars.contains(currentBaseIndex);
            const isLeftBarShiftToLeft =
                this._horzScaleBehavior.key(oldFirstTime) > this._horzScaleBehavior.key(newFirstTime);
            const isSeriesPointsAdded = newBaseIndex !== null && newBaseIndex > currentBaseIndex;
            const isSeriesPointsAddedToRight = isSeriesPointsAdded && !isLeftBarShiftToLeft;

            const allowShiftWhenReplacingWhitespace =
                this._timeScale.options().allowShiftVisibleRangeOnWhitespaceReplacement;
            const replacedExistingWhitespace = firstChangedPointIndex === undefined;
            const needShiftVisibleRangeOnNewBar =
                isLastSeriesBarVisible &&
                (!replacedExistingWhitespace || allowShiftWhenReplacingWhitespace) &&
                this._timeScale.options().shiftVisibleRangeOnNewBar;
            if (isSeriesPointsAddedToRight && !needShiftVisibleRangeOnNewBar) {
                const compensationShift = newBaseIndex - currentBaseIndex;
                this._timeScale.setRightOffset(this._timeScale.rightOffset() - compensationShift);
            }
        }

        this._timeScale.setBaseIndex(newBaseIndex);
    }

    public recalculatePane(pane: Pane | null): void {
        if (pane !== null) {
            pane.recalculate();
        }
    }

    public paneForSource(source: IPriceDataSource): Pane | null {
        const pane = this._panes.find((p: Pane) => p.orderedSources().includes(source));
        return pane === undefined ? null : pane;
    }

    public recalculateAllPanes(): void {
        this._watermark.updateAllViews();
        this._panes.forEach((p: Pane) => p.recalculate());
        this.updateCrosshair();
    }

    public destroy(): void {
        this._panes.forEach((p: Pane) => p.destroy());
        this._panes.length = 0;

        // to avoid memleaks
        this._options.localization.priceFormatter = undefined;
        this._options.localization.percentageFormatter = undefined;
        this._options.localization.timeFormatter = undefined;
    }

    public rendererOptionsProvider(): PriceAxisRendererOptionsProvider {
        return this._rendererOptionsProvider;
    }

    public priceAxisRendererOptions(): Readonly<PriceAxisViewRendererOptions> {
        return this._rendererOptionsProvider.options();
    }

    public priceScalesOptionsChanged(): ISubscription {
        return this._priceScalesOptionsChanged;
    }

    public createSeries<T extends SeriesType>(
        seriesType: T,
        options: SeriesOptionsMap[T],
        customPaneView?: ICustomSeriesPaneView<THorzScaleItem>,
    ): Series<T> {
        const pane = getDefined(this._panes[0]);
        const series = this._createSeries(options, seriesType, pane, customPaneView);
        this._serieses.push(series);

        if (this._serieses.length === 1) {
            // call fullUpdate to recalculate chart's parts geometry
            this.fullUpdate();
        } else {
            this.lightUpdate();
        }

        return series;
    }

    public removeSeries(series: Series<SeriesType>): void {
        const pane = this.paneForSource(series);

        const seriesIndex = this._serieses.indexOf(series);
        assert(seriesIndex !== -1, 'Series not found');

        this._serieses.splice(seriesIndex, 1);
        getNotNull(pane).removeDataSource(series);
        series.destroy();
    }

    public moveSeriesToScale(series: Series<SeriesType>, targetScaleId: string): void {
        const pane = getNotNull(this.paneForSource(series));
        pane.removeDataSource(series);

        // check if targetScaleId exists
        const target = this.findPriceScale(targetScaleId);
        if (target === null) {
            // new scale on the same pane
            const zOrder = series.zorder();
            pane.addDataSource(series, targetScaleId, zOrder);
        } else {
            // if move to the new scale of the same pane, keep zorder
            // if move to new pane
            const zOrder = target.pane === pane ? series.zorder() : undefined;
            target.pane.addDataSource(series, targetScaleId, zOrder);
        }
    }

    public fitContent(): void {
        const mask = InvalidateMask.light();
        mask.setFitContent();
        this._invalidate(mask);
    }

    public setTargetLogicalRange(range: LogicalRange): void {
        const mask = InvalidateMask.light();
        mask.applyRange(range);
        this._invalidate(mask);
    }

    public resetTimeScale(): void {
        const mask = InvalidateMask.light();
        mask.resetTimeScale();
        this._invalidate(mask);
    }

    public setBarSpacing(spacing: number): void {
        const mask = InvalidateMask.light();
        mask.setBarSpacing(spacing);
        this._invalidate(mask);
    }

    public setRightOffset(offset: number): void {
        const mask = InvalidateMask.light();
        mask.setRightOffset(offset);
        this._invalidate(mask);
    }

    public setTimeScaleAnimation(animation: ITimeScaleAnimation): void {
        const mask = InvalidateMask.light();
        mask.setTimeScaleAnimation(animation);
        this._invalidate(mask);
    }

    public stopTimeScaleAnimation(): void {
        const mask = InvalidateMask.light();
        mask.stopTimeScaleAnimation();
        this._invalidate(mask);
    }

    public defaultVisiblePriceScaleId(): string {
        return this._options.rightPriceScale.visible ? DefaultPriceScaleId.Right : DefaultPriceScaleId.Left;
    }

    public backgroundBottomColor(): string {
        return this._backgroundBottomColor;
    }

    public backgroundTopColor(): string {
        return this._backgroundTopColor;
    }

    public backgroundColorAtYPercentFromTop(percent: number): string {
        const bottomColor = this._backgroundBottomColor;
        const topColor = this._backgroundTopColor;

        if (bottomColor === topColor) {
            // solid background
            return bottomColor;
        }

        // gradient background

        // percent should be from 0 to 100 (we're using only integer values to make cache more efficient)
        percent = Math.max(0, Math.min(100, Math.round(percent * 100)));

        if (
            this._gradientColorsCache === null ||
            this._gradientColorsCache.topColor !== topColor ||
            this._gradientColorsCache.bottomColor !== bottomColor
        ) {
            this._gradientColorsCache = {
                topColor: topColor,
                bottomColor: bottomColor,
                colors: new Map(),
            };
        } else {
            const cachedValue = this._gradientColorsCache.colors.get(percent);
            if (cachedValue !== undefined) {
                return cachedValue;
            }
        }

        const result = gradientColorAtPercent(topColor, bottomColor, percent / 100);
        this._gradientColorsCache.colors.set(percent, result);
        return result;
    }

    private _paneInvalidationMask(pane: Pane | null, level: InvalidationLevel): InvalidateMask {
        const inv = new InvalidateMask(level);
        if (pane !== null) {
            const index = this._panes.indexOf(pane);
            inv.invalidatePane(index, {
                level,
            });
        }
        return inv;
    }

    private _invalidationMaskForSource(source: IPriceDataSource, invalidateType?: InvalidationLevel): InvalidateMask {
        if (invalidateType === undefined) {
            invalidateType = InvalidationLevel.Light;
        }

        return this._paneInvalidationMask(this.paneForSource(source), invalidateType);
    }

    private _invalidate(mask: InvalidateMask): void {
        this._invalidateHandler(mask);

        this._panes.forEach((pane: Pane) => pane.grid().paneView().update());
    }

    private _createSeries<T extends SeriesType>(
        options: SeriesOptionsInternal<T>,
        seriesType: T,
        pane: Pane,
        customPaneView?: ICustomSeriesPaneView<THorzScaleItem>,
    ): Series<T> {
        const series = new Series<T>(this, options, seriesType, customPaneView);

        const targetScaleId =
            options.priceScaleId !== undefined ? options.priceScaleId : this.defaultVisiblePriceScaleId();
        pane.addDataSource(series, targetScaleId);

        if (!isDefaultPriceScale(targetScaleId)) {
            // let's apply that options again to apply margins
            series.applyOptions(options);
        }

        return series;
    }

    private _getBackgroundColor(side: BackgroundColorSide): string {
        const layoutOptions = this._options.layout;

        if (layoutOptions.background.type === ColorType.VerticalGradient) {
            return side === BackgroundColorSide.Top
                ? layoutOptions.background.topColor
                : layoutOptions.background.bottomColor;
        }

        return layoutOptions.background.color;
    }
}
