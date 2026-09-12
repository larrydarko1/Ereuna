import { type IPriceFormatter } from '@/lib/lightweight-charts/formatters/iprice-formatter';
import { PercentageFormatter } from '@/lib/lightweight-charts/formatters/percentage-formatter';
import { PriceFormatter } from '@/lib/lightweight-charts/formatters/price-formatter';
import { VolumeFormatter } from '@/lib/lightweight-charts/formatters/volume-formatter';

import { getDefined, getNotNull } from '@/lib/lightweight-charts/helpers/assertions';
import { type IDestroyable } from '@/lib/lightweight-charts/helpers/idestroyable';
import { isInteger, merge } from '@/lib/lightweight-charts/helpers/strict-type-checks';

import { SeriesAreaPaneView } from '@/lib/lightweight-charts/views/pane/area-pane-view';
import { SeriesBarsPaneView } from '@/lib/lightweight-charts/views/pane/bars-pane-view';
import { SeriesBaselinePaneView } from '@/lib/lightweight-charts/views/pane/baseline-pane-view';
import { SeriesCandlesticksPaneView } from '@/lib/lightweight-charts/views/pane/candlesticks-pane-view';
import { SeriesCustomPaneView } from '@/lib/lightweight-charts/views/pane/custom-pane-view';
import { SeriesHistogramPaneView } from '@/lib/lightweight-charts/views/pane/histogram-pane-view';
import { type IPaneView } from '@/lib/lightweight-charts/views/pane/ipane-view';
import { type IUpdatablePaneView } from '@/lib/lightweight-charts/views/pane/iupdatable-pane-view';
import { SeriesLinePaneView } from '@/lib/lightweight-charts/views/pane/line-pane-view';
import { PanePriceAxisView } from '@/lib/lightweight-charts/views/pane/pane-price-axis-view';
import { SeriesHorizontalBaseLinePaneView } from '@/lib/lightweight-charts/views/pane/series-horizontal-base-line-pane-view';
import { SeriesLastPriceAnimationPaneView } from '@/lib/lightweight-charts/views/pane/series-last-price-animation-pane-view';
import { SeriesMarkersPaneView } from '@/lib/lightweight-charts/views/pane/series-markers-pane-view';
import { SeriesPriceLinePaneView } from '@/lib/lightweight-charts/views/pane/series-price-line-pane-view';
import { type IPriceAxisView } from '@/lib/lightweight-charts/views/price-axis/iprice-axis-view';
import { SeriesPriceAxisView } from '@/lib/lightweight-charts/views/price-axis/series-price-axis-view';
import { type ITimeAxisView } from '@/lib/lightweight-charts/views/time-axis/itime-axis-view';

import { AutoscaleInfoImpl, type AutoScaleMargins } from '@/lib/lightweight-charts/model/autoscale-info-impl';
import { type BarPrice, type BarPrices } from '@/lib/lightweight-charts/model/bar';
import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import { CustomPriceLine } from '@/lib/lightweight-charts/model/custom-price-line';
import { isDefaultPriceScale } from '@/lib/lightweight-charts/model/default-price-scale';
import {
    type CustomData,
    type CustomSeriesWhitespaceData,
    type ICustomSeriesPaneView,
    type WhitespaceCheck,
} from '@/lib/lightweight-charts/model/icustom-series';
import { type InternalHorzScaleItem } from '@/lib/lightweight-charts/model/ihorz-scale-behavior';
import { type FirstValue, type IPriceDataSource } from '@/lib/lightweight-charts/model/iprice-data-source';
import {
    type ISeriesPrimitiveBase,
    type PrimitiveHoveredItem,
    type SeriesPrimitivePaneViewZOrder,
} from '@/lib/lightweight-charts/model/iseries-primitive';
import { type Pane } from '@/lib/lightweight-charts/model/pane';
import { PlotRowValueIndex } from '@/lib/lightweight-charts/model/plot-data';
import { MismatchDirection } from '@/lib/lightweight-charts/model/plot-list';
import { PriceDataSource } from '@/lib/lightweight-charts/model/price-data-source';
import { type PriceLineOptions } from '@/lib/lightweight-charts/model/price-line-options';
import { PriceRangeImpl } from '@/lib/lightweight-charts/model/price-range-impl';
import { type PriceScale } from '@/lib/lightweight-charts/model/price-scale';
import { type ISeriesBarColorer, SeriesBarColorer } from '@/lib/lightweight-charts/model/series-bar-colorer';
import {
    createSeriesPlotList,
    type SeriesPlotList,
    type SeriesPlotRow,
} from '@/lib/lightweight-charts/model/series-data';
import { type InternalSeriesMarker, type SeriesMarker } from '@/lib/lightweight-charts/model/series-markers';
import {
    type AreaStyleOptions,
    type BaselineStyleOptions,
    type HistogramStyleOptions,
    type LineStyleOptions,
    type SeriesOptionsMap,
    type SeriesPartialOptionsMap,
    type SeriesType,
} from '@/lib/lightweight-charts/model/series-options';
import {
    type ISeriesPrimitivePaneViewWrapper,
    SeriesPrimitiveWrapper,
} from '@/lib/lightweight-charts/model/series-primitive-wrapper';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';

type PrimitivePaneViewExtractor = (wrapper: SeriesPrimitiveWrapper) => readonly ISeriesPrimitivePaneViewWrapper[];
function extractPrimitivePaneViews(
    primitives: SeriesPrimitiveWrapper[],
    extractor: PrimitivePaneViewExtractor,
    zOrder: SeriesPrimitivePaneViewZOrder,
    destination: IPaneView[],
): void {
    primitives.forEach((wrapper: SeriesPrimitiveWrapper) => {
        extractor(wrapper).forEach((paneView: ISeriesPrimitivePaneViewWrapper) => {
            if (paneView.zOrder() !== zOrder) {
                return;
            }
            destination.push(paneView);
        });
    });
}

function primitivePaneViewsExtractor(wrapper: SeriesPrimitiveWrapper): readonly ISeriesPrimitivePaneViewWrapper[] {
    return wrapper.paneViews();
}
function primitivePricePaneViewsExtractor(wrapper: SeriesPrimitiveWrapper): readonly ISeriesPrimitivePaneViewWrapper[] {
    return wrapper.priceAxisPaneViews();
}
function primitiveTimePaneViewsExtractor(wrapper: SeriesPrimitiveWrapper): readonly ISeriesPrimitivePaneViewWrapper[] {
    return wrapper.timeAxisPaneViews();
}

type CustomDataToPlotRowValueConverter<THorzScaleItem> = (
    item: CustomData<THorzScaleItem> | CustomSeriesWhitespaceData<THorzScaleItem>,
) => number[];

export type LastValueDataResultWithoutData = {
    noData: true;
};

export type LastValueDataResultWithData = {
    noData: false;

    price: number;
    text: string;
    formattedPriceAbsolute: string;
    formattedPricePercentage: string;
    color: string;
    coordinate: Coordinate;
    index: TimePointIndex;
};

export type LastValueDataResult = LastValueDataResultWithoutData | LastValueDataResultWithData;

export type MarkerData = {
    price: BarPrice;
    radius: number;
    borderColor: string | null;
    borderWidth: number;
    backgroundColor: string;
};

export type SeriesDataAtTypeMap = {
    Bar: BarPrices;
    Candlestick: BarPrices;
    Area: BarPrice;
    Baseline: BarPrice;
    Line: BarPrice;
    Histogram: BarPrice;
    Custom: BarPrice;
};

export type SeriesUpdateInfo = {
    lastBarUpdatedOrNewBarsAddedToTheRight: boolean;
};

// note that if would like to use `Omit` here - you can't due https://github.com/microsoft/TypeScript/issues/36981
export type SeriesOptionsInternal<T extends SeriesType = SeriesType> = SeriesOptionsMap[T];
export type SeriesPartialOptionsInternal<T extends SeriesType = SeriesType> = SeriesPartialOptionsMap[T];

export type ISeries<T extends SeriesType> = {
    bars(): SeriesPlotList<T>;
    visible(): boolean;
    options(): Readonly<SeriesOptionsMap[T]>;
    title(): string;
    priceScale(): PriceScale;
    lastValueData(globalLast: boolean): LastValueDataResult;
    indexedMarkers(): InternalSeriesMarker<TimePointIndex>[];
    barColorer(): ISeriesBarColorer<T>;
    markerDataAtIndex(index: TimePointIndex): MarkerData | null;
    dataAt(time: TimePointIndex): SeriesDataAtTypeMap[SeriesType] | null;
} & IPriceDataSource;

export class Series<T extends SeriesType> extends PriceDataSource implements IDestroyable, ISeries<SeriesType> {
    private readonly _seriesType: T;
    private _data: SeriesPlotList<T> = createSeriesPlotList<T>();
    private readonly _priceAxisViews: IPriceAxisView[];
    private readonly _panePriceAxisView: PanePriceAxisView;
    private _formatter!: IPriceFormatter;
    private readonly _priceLineView: SeriesPriceLinePaneView = new SeriesPriceLinePaneView(this);
    private readonly _customPriceLines: CustomPriceLine[] = [];
    private readonly _baseHorizontalLineView: SeriesHorizontalBaseLinePaneView = new SeriesHorizontalBaseLinePaneView(
        this,
    );
    private _paneView!: IUpdatablePaneView | SeriesCustomPaneView;
    private readonly _lastPriceAnimationPaneView: SeriesLastPriceAnimationPaneView | null = null;
    private _barColorerCache: SeriesBarColorer<T> | null = null;
    private readonly _options: SeriesOptionsInternal<T>;
    private _markers: readonly SeriesMarker<InternalHorzScaleItem>[] = [];
    private _indexedMarkers: InternalSeriesMarker<TimePointIndex>[] = [];
    private _markersPaneView!: SeriesMarkersPaneView;
    private _animationTimeoutId: TimerId | null = null;
    private _primitives: SeriesPrimitiveWrapper[] = [];

    public constructor(
        model: IChartModelBase,
        options: SeriesOptionsInternal<T>,
        seriesType: T,
        customPaneView?: ICustomSeriesPaneView<unknown>,
    ) {
        super(model);
        this._options = options;
        this._seriesType = seriesType;

        const priceAxisView = new SeriesPriceAxisView(this);
        this._priceAxisViews = [priceAxisView];

        this._panePriceAxisView = new PanePriceAxisView(priceAxisView, this, model);

        if (seriesType === 'Area' || seriesType === 'Line' || seriesType === 'Baseline') {
            this._lastPriceAnimationPaneView = new SeriesLastPriceAnimationPaneView(
                this as Series<'Area'> | Series<'Line'> | Series<'Baseline'>,
            );
        }

        this._recreateFormatter();

        this._recreatePaneViews(customPaneView);
    }

    public destroy(): void {
        if (this._animationTimeoutId !== null) {
            clearTimeout(this._animationTimeoutId);
        }
    }

    public priceLineColor(lastBarColor: string): string {
        return this._options.priceLineColor === '' ? lastBarColor : this._options.priceLineColor;
    }

    public lastValueData(globalLast: boolean): LastValueDataResult {
        const noDataRes: LastValueDataResultWithoutData = { noData: true };

        const priceScale = this.priceScale();

        if (this.model().timeScale().isEmpty() || priceScale.isEmpty() || this._data.isEmpty()) {
            return noDataRes;
        }

        const visibleBars = this.model().timeScale().visibleStrictRange();
        const firstValue = this.firstValue();
        if (visibleBars === null || firstValue === null) {
            return noDataRes;
        }

        // find range of bars inside range
        let bar: SeriesPlotRow<T> | null;
        let lastIndex: TimePointIndex;
        if (globalLast) {
            const lastBar = this._data.last();
            if (lastBar === null) {
                return noDataRes;
            }

            bar = lastBar;
            lastIndex = lastBar.index;
        } else {
            const endBar = this._data.search(visibleBars.right(), MismatchDirection.NearestLeft);
            if (endBar === null) {
                return noDataRes;
            }

            bar = this._data.valueAt(endBar.index);
            if (bar === null) {
                return noDataRes;
            }
            lastIndex = endBar.index;
        }

        const price = bar.value[PlotRowValueIndex.Close];
        const barColorer = this.barColorer();
        const style = barColorer.barStyle(lastIndex, { value: bar });
        const coordinate = priceScale.priceToCoordinate(price, firstValue.value);

        return {
            noData: false,
            price,
            text: priceScale.formatPrice(price, firstValue.value),
            formattedPriceAbsolute: priceScale.formatPriceAbsolute(price),
            formattedPricePercentage: priceScale.formatPricePercentage(price, firstValue.value),
            color: style.barColor,
            coordinate: coordinate,
            index: lastIndex,
        };
    }

    public barColorer(): SeriesBarColorer<T> {
        if (this._barColorerCache !== null) {
            return this._barColorerCache;
        }

        this._barColorerCache = new SeriesBarColorer(this);
        return this._barColorerCache;
    }

    public options(): Readonly<SeriesOptionsMap[T]> {
        return this._options;
    }

    public applyOptions(options: SeriesPartialOptionsInternal<T>): void {
        const targetPriceScaleId = options.priceScaleId;
        if (targetPriceScaleId !== undefined && targetPriceScaleId !== this._options.priceScaleId) {
            // series cannot do it itself, ask model
            this.model().moveSeriesToScale(this, targetPriceScaleId);
        }
        merge(this._options, options);

        if (options.priceFormat !== undefined) {
            this._recreateFormatter();

            // updated formatter might affect rendering  and as a consequence of this the width of price axis might be changed
            // thus we need to force the chart to do a full update to apply changes correctly
            // full update is quite heavy operation in terms of performance
            // but updating formatter looks like quite rare so forcing a full update here shouldn't affect the performance a lot
            this.model().fullUpdate();
        }

        this.model().updateSource(this);

        // a series might affect crosshair by some options (like crosshair markers)
        // that's why we need to update crosshair as well
        this.model().updateCrosshair();

        this._paneView.update('options');
    }

    public setData(data: readonly SeriesPlotRow<T>[], updateInfo?: SeriesUpdateInfo): void {
        this._data.setData(data);

        this._recalculateMarkers();

        this._paneView.update('data');
        this._markersPaneView.update('data');

        if (this._lastPriceAnimationPaneView !== null) {
            if (updateInfo?.lastBarUpdatedOrNewBarsAddedToTheRight === true) {
                this._lastPriceAnimationPaneView.onNewRealtimeDataReceived();
            } else if (data.length === 0) {
                this._lastPriceAnimationPaneView.onDataCleared();
            }
        }

        const sourcePane = this.model().paneForSource(this);
        this.model().recalculatePane(sourcePane);
        this.model().updateSource(this);
        this.model().updateCrosshair();
        this.model().lightUpdate();
    }

    public setMarkers(data: readonly SeriesMarker<InternalHorzScaleItem>[]): void {
        this._markers = data;
        this._recalculateMarkers();
        const sourcePane = this.model().paneForSource(this);
        this._markersPaneView.update('data');
        this.model().recalculatePane(sourcePane);
        this.model().updateSource(this);
        this.model().updateCrosshair();
        this.model().lightUpdate();
    }

    public markers(): readonly SeriesMarker<InternalHorzScaleItem>[] {
        return this._markers;
    }

    public indexedMarkers(): InternalSeriesMarker<TimePointIndex>[] {
        return this._indexedMarkers;
    }

    public createPriceLine(options: PriceLineOptions): CustomPriceLine {
        const result = new CustomPriceLine(this, options);
        this._customPriceLines.push(result);
        this.model().updateSource(this);
        return result;
    }

    public removePriceLine(line: CustomPriceLine): void {
        const index = this._customPriceLines.indexOf(line);
        if (index !== -1) {
            this._customPriceLines.splice(index, 1);
        }
        this.model().updateSource(this);
    }

    public seriesType(): T {
        return this._seriesType;
    }

    public firstValue(): FirstValue | null {
        const bar = this.firstBar();
        if (bar === null) {
            return null;
        }

        return {
            value: bar.value[PlotRowValueIndex.Close],
            timePoint: bar.time,
        };
    }

    public firstBar(): SeriesPlotRow<T> | null {
        const visibleBars = this.model().timeScale().visibleStrictRange();
        if (visibleBars === null) {
            return null;
        }

        const startTimePoint = visibleBars.left();
        return this._data.search(startTimePoint, MismatchDirection.NearestRight);
    }

    public bars(): SeriesPlotList<T> {
        return this._data;
    }

    public dataAt(time: TimePointIndex): SeriesDataAtTypeMap[SeriesType] | null {
        const prices = this._data.valueAt(time);
        if (prices === null) {
            return null;
        }
        if (this._seriesType === 'Bar' || this._seriesType === 'Candlestick' || this._seriesType === 'Custom') {
            return {
                open: prices.value[PlotRowValueIndex.Open] as BarPrice,
                high: prices.value[PlotRowValueIndex.High] as BarPrice,
                low: prices.value[PlotRowValueIndex.Low] as BarPrice,
                close: prices.value[PlotRowValueIndex.Close] as BarPrice,
            };
        }
        return prices.value[PlotRowValueIndex.Close] as BarPrice;
    }

    public topPaneViews(_pane: Pane): readonly IPaneView[] {
        const res: IPaneView[] = [];
        extractPrimitivePaneViews(this._primitives, primitivePaneViewsExtractor, 'top', res);
        const animationPaneView = this._lastPriceAnimationPaneView;
        if (animationPaneView === null || !animationPaneView.visible()) {
            return res;
        }

        if (this._animationTimeoutId === null && animationPaneView.animationActive()) {
            this._animationTimeoutId = setTimeout(() => {
                this._animationTimeoutId = null;
                this.model().cursorUpdate();
            }, 0);
        }

        animationPaneView.invalidateStage();
        res.unshift(animationPaneView);
        return res;
    }

    public paneViews(): readonly IPaneView[] {
        const res: IPaneView[] = [];

        if (!this._isOverlay()) {
            res.push(this._baseHorizontalLineView);
        }

        res.push(this._paneView, this._priceLineView, this._markersPaneView);

        const priceLineViews = this._customPriceLines.map((line: CustomPriceLine) => line.paneView());
        res.push(...priceLineViews);
        extractPrimitivePaneViews(this._primitives, primitivePaneViewsExtractor, 'normal', res);

        return res;
    }

    public bottomPaneViews(): readonly IPaneView[] {
        return this._extractPaneViews(primitivePaneViewsExtractor, 'bottom');
    }

    public pricePaneViews(zOrder: SeriesPrimitivePaneViewZOrder): readonly IPaneView[] {
        return this._extractPaneViews(primitivePricePaneViewsExtractor, zOrder);
    }

    public timePaneViews(zOrder: SeriesPrimitivePaneViewZOrder): readonly IPaneView[] {
        return this._extractPaneViews(primitiveTimePaneViewsExtractor, zOrder);
    }

    public primitiveHitTest(x: Coordinate, y: Coordinate): PrimitiveHoveredItem[] {
        return this._primitives
            .map((primitive: SeriesPrimitiveWrapper) => primitive.hitTest(x, y))
            .filter((result: PrimitiveHoveredItem | null): result is PrimitiveHoveredItem => result !== null);
    }

    public override labelPaneViews(_pane?: Pane): readonly IPaneView[] {
        return [
            this._panePriceAxisView,
            ...this._customPriceLines.map((line: CustomPriceLine) => line.labelPaneView()),
        ];
    }

    public override priceAxisViews(_pane: Pane, priceScale: PriceScale): readonly IPriceAxisView[] {
        if (priceScale !== this._priceScale && !this._isOverlay()) {
            return [];
        }
        const result = [...this._priceAxisViews];
        for (const customPriceLine of this._customPriceLines) {
            result.push(customPriceLine.priceAxisView());
        }
        this._primitives.forEach((wrapper: SeriesPrimitiveWrapper) => {
            result.push(...wrapper.priceAxisViews());
        });
        return result;
    }

    public override timeAxisViews(): readonly ITimeAxisView[] {
        const res: ITimeAxisView[] = [];
        this._primitives.forEach((wrapper: SeriesPrimitiveWrapper) => {
            res.push(...wrapper.timeAxisViews());
        });
        return res;
    }

    public autoscaleInfo(startTimePoint: TimePointIndex, endTimePoint: TimePointIndex): AutoscaleInfoImpl | null {
        if (this._options.autoscaleInfoProvider !== undefined) {
            const autoscaleInfo = this._options.autoscaleInfoProvider(() => {
                const res = this._autoscaleInfoImpl(startTimePoint, endTimePoint);
                return res === null ? null : res.toRaw();
            });

            return AutoscaleInfoImpl.fromRaw(autoscaleInfo);
        }
        return this._autoscaleInfoImpl(startTimePoint, endTimePoint);
    }

    public minMove(): number {
        return this._options.priceFormat.minMove;
    }

    public formatter(): IPriceFormatter {
        return this._formatter;
    }

    public updateAllViews(): void {
        this._paneView.update();
        this._markersPaneView.update();

        for (const priceAxisView of this._priceAxisViews) {
            priceAxisView.update();
        }

        for (const customPriceLine of this._customPriceLines) {
            customPriceLine.update();
        }

        this._priceLineView.update();
        this._baseHorizontalLineView.update();
        this._lastPriceAnimationPaneView?.update();

        this._primitives.forEach((wrapper: SeriesPrimitiveWrapper) => wrapper.updateAllViews());
    }

    public override priceScale(): PriceScale {
        return getNotNull(super.priceScale());
    }

    public markerDataAtIndex(index: TimePointIndex): MarkerData | null {
        const getValue =
            (this._seriesType === 'Line' || this._seriesType === 'Area' || this._seriesType === 'Baseline') &&
            (this._options as LineStyleOptions | AreaStyleOptions | BaselineStyleOptions).crosshairMarkerVisible;

        if (!getValue) {
            return null;
        }
        const bar = this._data.valueAt(index);
        if (bar === null) {
            return null;
        }
        const price = bar.value[PlotRowValueIndex.Close] as BarPrice;
        const radius = this._markerRadius();
        const borderColor = this._markerBorderColor();
        const borderWidth = this._markerBorderWidth();
        const backgroundColor = this._markerBackgroundColor(index);
        return { price, radius, borderColor, borderWidth, backgroundColor };
    }

    public title(): string {
        return this._options.title;
    }

    public override visible(): boolean {
        return this._options.visible;
    }

    public attachPrimitive(primitive: ISeriesPrimitiveBase): void {
        this._primitives.push(new SeriesPrimitiveWrapper(primitive, this));
    }

    public detachPrimitive(source: ISeriesPrimitiveBase): void {
        this._primitives = this._primitives.filter((wrapper: SeriesPrimitiveWrapper) => wrapper.primitive() !== source);
    }

    public customSeriesPlotValuesBuilder(): CustomDataToPlotRowValueConverter<unknown> | undefined {
        if (this._paneView instanceof SeriesCustomPaneView === false) {
            return undefined;
        }
        return (data: CustomData<unknown> | CustomSeriesWhitespaceData<unknown>): number[] => {
            return (this._paneView as SeriesCustomPaneView).priceValueBuilder(data);
        };
    }

    public customSeriesWhitespaceCheck<THorzScaleItem>(): WhitespaceCheck<THorzScaleItem> | undefined {
        if (this._paneView instanceof SeriesCustomPaneView === false) {
            return undefined;
        }
        return (
            data: CustomData<THorzScaleItem> | CustomSeriesWhitespaceData<THorzScaleItem>,
        ): data is CustomSeriesWhitespaceData<THorzScaleItem> => {
            return (this._paneView as SeriesCustomPaneView).isWhitespace(data);
        };
    }

    private _isOverlay(): boolean {
        const priceScale = this.priceScale();
        return !isDefaultPriceScale(priceScale.id());
    }

    private _autoscaleInfoImpl(startTimePoint: TimePointIndex, endTimePoint: TimePointIndex): AutoscaleInfoImpl | null {
        if (!isInteger(startTimePoint) || !isInteger(endTimePoint) || this._data.isEmpty()) {
            return null;
        }

        // series data is strongly hardcoded to keep bars
        const plots =
            this._seriesType === 'Line' ||
            this._seriesType === 'Area' ||
            this._seriesType === 'Baseline' ||
            this._seriesType === 'Histogram'
                ? [PlotRowValueIndex.Close]
                : [PlotRowValueIndex.Low, PlotRowValueIndex.High];

        const barsMinMax = this._data.minMaxOnRangeCached(startTimePoint, endTimePoint, plots);

        let range = barsMinMax !== null ? new PriceRangeImpl(barsMinMax.min, barsMinMax.max) : null;

        if (this.seriesType() === 'Histogram') {
            const base = (this._options as HistogramStyleOptions).base;
            const rangeWithBase = new PriceRangeImpl(base, base);
            range = range !== null ? range.merge(rangeWithBase) : rangeWithBase;
        }

        let margins = this._markersPaneView.autoScaleMargins();
        this._primitives.forEach((primitive: SeriesPrimitiveWrapper) => {
            const primitiveAutoscale = primitive.autoscaleInfo(startTimePoint, endTimePoint);

            if (primitiveAutoscale !== null) {
                const primitiveRange = new PriceRangeImpl(
                    primitiveAutoscale.priceRange.minValue,
                    primitiveAutoscale.priceRange.maxValue,
                );
                range = range !== null ? range.merge(primitiveRange) : primitiveRange;

                if (primitiveAutoscale.margins !== undefined) {
                    margins = mergeMargins(margins, primitiveAutoscale.margins);
                }
            }
        });

        return new AutoscaleInfoImpl(range, margins);
    }

    private _markerRadius(): number {
        switch (this._seriesType) {
            case 'Line':
            case 'Area':
            case 'Baseline':
                return (this._options as LineStyleOptions | AreaStyleOptions | BaselineStyleOptions)
                    .crosshairMarkerRadius;
        }

        return 0;
    }

    private _markerBorderColor(): string | null {
        switch (this._seriesType) {
            case 'Line':
            case 'Area':
            case 'Baseline': {
                const crosshairMarkerBorderColor = (
                    this._options as LineStyleOptions | AreaStyleOptions | BaselineStyleOptions
                ).crosshairMarkerBorderColor;
                if (crosshairMarkerBorderColor.length !== 0) {
                    return crosshairMarkerBorderColor;
                }
            }
        }

        return null;
    }

    private _markerBorderWidth(): number {
        switch (this._seriesType) {
            case 'Line':
            case 'Area':
            case 'Baseline':
                return (this._options as LineStyleOptions | AreaStyleOptions | BaselineStyleOptions)
                    .crosshairMarkerBorderWidth;
        }

        return 0;
    }

    private _markerBackgroundColor(index: TimePointIndex): string {
        switch (this._seriesType) {
            case 'Line':
            case 'Area':
            case 'Baseline': {
                const crosshairMarkerBackgroundColor = (
                    this._options as LineStyleOptions | AreaStyleOptions | BaselineStyleOptions
                ).crosshairMarkerBackgroundColor;
                if (crosshairMarkerBackgroundColor.length !== 0) {
                    return crosshairMarkerBackgroundColor;
                }
            }
        }

        return this.barColorer().barStyle(index).barColor;
    }

    private _recreateFormatter(): void {
        switch (this._options.priceFormat.type) {
            case 'custom': {
                this._formatter = { format: this._options.priceFormat.formatter };
                break;
            }
            case 'volume': {
                this._formatter = new VolumeFormatter(this._options.priceFormat.precision);
                break;
            }
            case 'percent': {
                this._formatter = new PercentageFormatter(this._options.priceFormat.precision);
                break;
            }
            default: {
                const priceScale = Math.pow(10, this._options.priceFormat.precision);
                this._formatter = new PriceFormatter(priceScale, this._options.priceFormat.minMove * priceScale);
            }
        }

        if (this._priceScale !== null) {
            this._priceScale.updateFormatter();
        }
    }

    private _recalculateMarkers(): void {
        const timeScale = this.model().timeScale();
        if (!timeScale.hasPoints() || this._data.isEmpty()) {
            this._indexedMarkers = [];
            return;
        }

        const firstDataIndex = getNotNull(this._data.firstIndex());

        this._indexedMarkers = this._markers.map<InternalSeriesMarker<TimePointIndex>>(
            (marker: SeriesMarker<InternalHorzScaleItem>, index: number) => {
                // the first find index on the time scale (across all series)
                const timePointIndex = getNotNull(timeScale.timeToNearestIndex(marker.time));

                // and then search that index inside the series data
                const searchMode =
                    timePointIndex < firstDataIndex ? MismatchDirection.NearestRight : MismatchDirection.NearestLeft;
                const seriesDataIndex = getNotNull(this._data.search(timePointIndex, searchMode)).index;
                return {
                    time: seriesDataIndex,
                    position: marker.position,
                    shape: marker.shape,
                    color: marker.color,
                    id: marker.id,
                    internalId: index,
                    text: marker.text,
                    size: marker.size,
                    originalTime: marker.originalTime,
                };
            },
        );
    }

    private _recreatePaneViews(customPaneView?: ICustomSeriesPaneView<unknown>): void {
        this._markersPaneView = new SeriesMarkersPaneView(this, this.model());

        switch (this._seriesType) {
            case 'Bar': {
                this._paneView = new SeriesBarsPaneView(this as Series<'Bar'>, this.model());
                break;
            }

            case 'Candlestick': {
                this._paneView = new SeriesCandlesticksPaneView(this as Series<'Candlestick'>, this.model());
                break;
            }

            case 'Line': {
                this._paneView = new SeriesLinePaneView(this as Series<'Line'>, this.model());
                break;
            }

            case 'Custom': {
                this._paneView = new SeriesCustomPaneView(
                    this as Series<'Custom'>,
                    this.model(),
                    getDefined(customPaneView),
                );
                break;
            }

            case 'Area': {
                this._paneView = new SeriesAreaPaneView(this as Series<'Area'>, this.model());
                break;
            }

            case 'Baseline': {
                this._paneView = new SeriesBaselinePaneView(this as Series<'Baseline'>, this.model());
                break;
            }

            case 'Histogram': {
                this._paneView = new SeriesHistogramPaneView(this as Series<'Histogram'>, this.model());
                break;
            }

            default:
                throw Error('Unknown chart style assigned: ' + this._seriesType);
        }
    }

    private _extractPaneViews(
        extractor: PrimitivePaneViewExtractor,
        zOrder: SeriesPrimitivePaneViewZOrder,
    ): readonly IPaneView[] {
        const res: IPaneView[] = [];
        extractPrimitivePaneViews(this._primitives, extractor, zOrder, res);
        return res;
    }
}

function mergeMargins(source: AutoScaleMargins | null, additionalMargin: AutoScaleMargins): AutoScaleMargins {
    return {
        above: Math.max(source?.above ?? 0, additionalMargin.above),
        below: Math.max(source?.below ?? 0, additionalMargin.below),
    };
}
