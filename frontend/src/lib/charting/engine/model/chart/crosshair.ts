/**
 * The crosshair: where it is, what it snaps to, and the labels it puts on both
 * axes.
 *
 * In magnet mode it does not follow the pointer — `Magnet` moves it to the nearest
 * price on the series under it, which is why its position and the pointer's are
 * tracked separately.
 */
import { getNotNull } from '@/lib/charting/engine/helpers/assertions';
import { notNull } from '@/lib/charting/engine/helpers/strict-type-checks';
import { type IChartModelBase } from '@/lib/charting/engine/model/chart/chart-model';
import { DataSource } from '@/lib/charting/engine/model/chart/data-source';
import { type Pane } from '@/lib/charting/engine/model/chart/pane';
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type BarPrice } from '@/lib/charting/engine/model/data/bar';
import { type PriceScale } from '@/lib/charting/engine/model/price/price-scale';
import { type ISeries } from '@/lib/charting/engine/model/series/series';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { type InternalHorzScaleItem } from '@/lib/charting/engine/model/time/ihorz-scale-behavior';
import { type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';
import { type LineStyle, type LineWidth } from '@/lib/charting/engine/renderers/draw-line';
import { CrosshairMarksPaneView } from '@/lib/charting/engine/views/pane/crosshair-marks-pane-view';
import { CrosshairPaneView } from '@/lib/charting/engine/views/pane/crosshair-pane-view';
import { type IPaneView } from '@/lib/charting/engine/views/pane/ipane-view';
import { CrosshairPriceAxisView } from '@/lib/charting/engine/views/price-axis/crosshair-price-axis-view';
import { type IPriceAxisView } from '@/lib/charting/engine/views/price-axis/iprice-axis-view';
import { type PriceAxisView } from '@/lib/charting/engine/views/price-axis/price-axis-view';
import { CrosshairTimeAxisView } from '@/lib/charting/engine/views/time-axis/crosshair-time-axis-view';
import { type ITimeAxisView } from '@/lib/charting/engine/views/time-axis/itime-axis-view';

export type CrosshairPriceAndCoordinate = {
    price: number;
    coordinate: number;
};

type CrosshairTimeAndCoordinate = {
    time: InternalHorzScaleItem;
    coordinate: number;
};

export type PriceAndCoordinateProvider = (priceScale: PriceScale) => CrosshairPriceAndCoordinate;

export type TimeAndCoordinateProvider = () => CrosshairTimeAndCoordinate | null;

export type CrosshairMode = (typeof CrosshairMode)[keyof typeof CrosshairMode];

/** Structure describing a crosshair line (vertical or horizontal) */
type CrosshairLineOptions = {
    /**
     * Crosshair line color.
     *
     * @defaultValue `'#758696'`
     */
    color: string;

    /**
     * Crosshair line width.
     *
     * @defaultValue `1`
     */
    width: LineWidth;

    /**
     * Crosshair line style.
     *
     * @defaultValue {@link LineStyle.LargeDashed}
     */
    style: LineStyle;

    /**
     * Display the crosshair line.
     *
     * Note that disabling crosshair lines does not disable crosshair marker on Line and Area series.
     * It can be disabled by using `crosshairMarkerVisible` option of a relevant series.
     *
     * @see {@link LineStyleOptions.crosshairMarkerVisible}
     * @see {@link AreaStyleOptions.crosshairMarkerVisible}
     * @see {@link BaselineStyleOptions.crosshairMarkerVisible}
     * @defaultValue `true`
     */
    visible: boolean;

    /**
     * Display the crosshair label on the relevant scale.
     *
     * @defaultValue `true`
     */
    labelVisible: boolean;

    /**
     * Crosshair label background color.
     *
     * @defaultValue `'#4c525e'`
     */
    labelBackgroundColor: string;
};

/** Structure describing crosshair options  */
export type CrosshairOptions = {
    /**
     * Crosshair mode
     *
     * @defaultValue {@link CrosshairMode.Magnet}
     */
    mode: CrosshairMode;

    /**
     * Vertical line options.
     */
    vertLine: CrosshairLineOptions;

    /**
     * Horizontal line options.
     */
    horzLine: CrosshairLineOptions;
};

type RawPriceProvider = () => BarPrice;

type RawCoordinateProvider = () => Coordinate;

type RawIndexProvider = () => TimePointIndex;

/**
 * Represents the crosshair mode.
 */
export const CrosshairMode = {
    /**
     * This mode allows crosshair to move freely on the chart.
     */
    Normal: 0,
    /**
     * This mode sticks crosshair's horizontal line to the price value of a single-value series or to the close price of OHLC-based series.
     */
    Magnet: 1,
    /**
     * This mode disables rendering of the crosshair.
     */
    Hidden: 2,
} as const;

export class Crosshair extends DataSource {
    private _pane: Pane | null = null;
    private _price = NaN;
    private _index: TimePointIndex = 0 as TimePointIndex;
    private _visible = true;
    private readonly _model: IChartModelBase;
    private _priceAxisViews = new Map<PriceScale, CrosshairPriceAxisView>();
    private readonly _timeAxisView: CrosshairTimeAxisView;
    private readonly _markersPaneView: CrosshairMarksPaneView;
    private _subscribed = false;
    private readonly _currentPosPriceProvider: PriceAndCoordinateProvider;
    private readonly _options: CrosshairOptions;
    private readonly _paneView: CrosshairPaneView;

    private _x: Coordinate = NaN as Coordinate;
    private _y: Coordinate = NaN as Coordinate;

    private _originX: Coordinate = NaN as Coordinate;
    private _originY: Coordinate = NaN as Coordinate;

    public constructor(model: IChartModelBase, options: CrosshairOptions) {
        super();
        this._model = model;
        this._options = options;
        this._markersPaneView = new CrosshairMarksPaneView(model, this);

        const valuePriceProvider = (
            rawPriceProvider: RawPriceProvider,
            rawCoordinateProvider: RawCoordinateProvider,
        ) => {
            return (priceScale: PriceScale): CrosshairPriceAndCoordinate => {
                const coordinate = rawCoordinateProvider();
                const rawPrice = rawPriceProvider();

                // The pane's own default scale already holds the price; any
                // other scale has to be read back out of the coordinate
                if (priceScale === getNotNull(this._pane).defaultPriceScale()) {
                    return { price: rawPrice, coordinate };
                }

                const firstValue = getNotNull(priceScale.firstValue());
                return { price: priceScale.coordinateToPrice(coordinate, firstValue), coordinate };
            };
        };

        const valueTimeProvider = (
            rawIndexProvider: RawIndexProvider,
            rawCoordinateProvider: RawCoordinateProvider,
        ) => {
            return (): CrosshairTimeAndCoordinate | null => {
                const time = this._model.timeScale().indexToTime(rawIndexProvider());
                const coordinate = rawCoordinateProvider();
                if (time === null || !Number.isFinite(coordinate)) {
                    return null;
                }
                return {
                    time,
                    coordinate,
                };
            };
        };

        // for current position always return both price and coordinate
        this._currentPosPriceProvider = valuePriceProvider(
            () => this._price as BarPrice,
            () => this._y,
        );

        const currentPosTimeProvider = valueTimeProvider(
            () => this._index,
            () => this.appliedX(),
        );

        this._timeAxisView = new CrosshairTimeAxisView(this, model, currentPosTimeProvider);
        this._paneView = new CrosshairPaneView(this);
    }

    public options(): Readonly<CrosshairOptions> {
        return this._options;
    }

    public saveOriginCoord(x: Coordinate, y: Coordinate): void {
        this._originX = x;
        this._originY = y;
    }

    public clearOriginCoord(): void {
        this._originX = NaN as Coordinate;
        this._originY = NaN as Coordinate;
    }

    public originCoordX(): Coordinate {
        return this._originX;
    }

    public originCoordY(): Coordinate {
        return this._originY;
    }

    public setPosition(index: TimePointIndex, price: number, pane: Pane): void {
        if (!this._subscribed) {
            this._subscribed = true;
        }

        this._visible = true;

        this._tryToUpdateViews(index, price, pane);
    }

    public appliedIndex(): TimePointIndex {
        return this._index;
    }

    public appliedX(): Coordinate {
        return this._x;
    }

    public appliedY(): Coordinate {
        return this._y;
    }

    public override visible(): boolean {
        return this._visible;
    }

    public clearPosition(): void {
        this._visible = false;
        this._setIndexToLastSeriesBarIndex();

        this._price = NaN;
        this._x = NaN as Coordinate;
        this._y = NaN as Coordinate;
        this._pane = null;

        this.clearOriginCoord();
    }

    public paneViews(_pane: Pane): readonly IPaneView[] {
        return this._pane !== null ? [this._paneView, this._markersPaneView] : [];
    }

    public horzLineVisible(pane: Pane): boolean {
        return pane === this._pane && this._options.horzLine.visible;
    }

    public vertLineVisible(): boolean {
        return this._options.vertLine.visible;
    }

    public override priceAxisViews(pane: Pane, priceScale: PriceScale): IPriceAxisView[] {
        if (!this._visible || this._pane !== pane) {
            this._priceAxisViews.clear();
        }

        const views: IPriceAxisView[] = [];
        if (this._pane === pane) {
            views.push(
                this._createPriceAxisViewOnDemand(this._priceAxisViews, priceScale, this._currentPosPriceProvider),
            );
        }

        return views;
    }

    public override timeAxisViews(): readonly ITimeAxisView[] {
        return this._visible ? [this._timeAxisView] : [];
    }

    public pane(): Pane | null {
        return this._pane;
    }

    public updateAllViews(): void {
        this._paneView.update();
        this._priceAxisViews.forEach((value: PriceAxisView) => value.update());
        this._timeAxisView.update();
        this._markersPaneView.update();
    }

    private _priceScaleByPane(pane: Pane): PriceScale | null {
        return pane.defaultPriceScale().isEmpty() ? null : pane.defaultPriceScale();
    }

    private _tryToUpdateViews(index: TimePointIndex, price: number, pane: Pane): void {
        if (this._tryToUpdateData(index, price, pane)) {
            this.updateAllViews();
        }
    }

    private _tryToUpdateData(newIndex: TimePointIndex, newPrice: number, newPane: Pane): boolean {
        const oldX = this._x;
        const oldY = this._y;
        const oldPrice = this._price;
        const oldIndex = this._index;
        const oldPane = this._pane;
        const priceScale = this._priceScaleByPane(newPane);

        this._index = newIndex;
        this._x = isNaN(newIndex) ? (NaN as Coordinate) : this._model.timeScale().indexToCoordinate(newIndex);
        this._pane = newPane;

        const firstValue = priceScale !== null ? priceScale.firstValue() : null;
        if (priceScale !== null && firstValue !== null) {
            this._price = newPrice;
            this._y = priceScale.priceToCoordinate(newPrice, firstValue);
        } else {
            this._price = NaN;
            this._y = NaN as Coordinate;
        }

        return (
            oldX !== this._x ||
            oldY !== this._y ||
            oldIndex !== this._index ||
            oldPrice !== this._price ||
            oldPane !== this._pane
        );
    }

    private _setIndexToLastSeriesBarIndex(): void {
        const lastIndexes = this._model
            .serieses()
            .map((s: ISeries<SeriesType>) => s.bars().lastIndex())
            .filter(notNull);
        const lastBarIndex = lastIndexes.length === 0 ? null : (Math.max(...lastIndexes) as TimePointIndex);
        this._index = lastBarIndex !== null ? lastBarIndex : (NaN as TimePointIndex);
    }

    private _createPriceAxisViewOnDemand(
        map: Map<PriceScale, CrosshairPriceAxisView>,
        priceScale: PriceScale,
        valueProvider: PriceAndCoordinateProvider,
    ): IPriceAxisView {
        let view = map.get(priceScale);

        if (view === undefined) {
            view = new CrosshairPriceAxisView(this, priceScale, valueProvider);
            map.set(priceScale, view);
        }

        return view;
    }
}
