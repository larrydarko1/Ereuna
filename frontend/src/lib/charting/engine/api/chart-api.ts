/**
 * The chart handle the rest of the app holds.
 *
 * Everything public goes through here: it owns the widget, the data layer and the
 * map from each `SeriesApi` back to the `Series` the model knows about, and it is
 * where a caller's partial options are merged into a complete set before the model
 * ever sees them.
 */
import { getSeriesDataCreator } from '@/lib/charting/engine/api/get-series-data-creator';
import {
    type IChartApiBase,
    type MouseEventHandler,
    type MouseEventParams,
    type PaneSize,
} from '@/lib/charting/engine/api/ichart-api';
import { type IPriceScaleApi } from '@/lib/charting/engine/api/iprice-scale-api';
import { type ISeriesApi } from '@/lib/charting/engine/api/iseries-api';
import { type ITimeScaleApi } from '@/lib/charting/engine/api/itime-scale-api';
import { chartOptionsDefaults } from '@/lib/charting/engine/api/options/chart-options-defaults';
import {
    areaStyleDefaults,
    barStyleDefaults,
    baselineStyleDefaults,
    candlestickStyleDefaults,
    customStyleDefaults,
    histogramStyleDefaults,
    lineStyleDefaults,
    seriesOptionsDefaults,
} from '@/lib/charting/engine/api/options/series-options-defaults';
import { PriceScaleApi } from '@/lib/charting/engine/api/price-scale-api';
import { SeriesApi } from '@/lib/charting/engine/api/series-api';
import { TimeScaleApi } from '@/lib/charting/engine/api/time-scale-api';
import {
    ChartWidget,
    type MouseEventParamsImpl,
    type MouseEventParamsImplSupplier,
} from '@/lib/charting/engine/gui/chart-widget';
import { assert, getPresent, getDefined } from '@/lib/charting/engine/helpers/assertions';
import { callerType } from '@/lib/charting/engine/helpers/caller-type';
import { Delegate } from '@/lib/charting/engine/helpers/delegate';
import { rejectOptions } from '@/lib/charting/engine/helpers/logger';
import { nominal } from '@/lib/charting/engine/helpers/nominal';
import { clone, type DeepPartial, isBoolean, merge } from '@/lib/charting/engine/helpers/strict-type-checks';
import { type ChartOptionsImpl, type ChartOptionsInternal } from '@/lib/charting/engine/model/chart/chart-options';
import {
    type DataUpdatesConsumer,
    isFulfilledData,
    type SeriesDataItemTypeMap,
    type WhitespaceData,
} from '@/lib/charting/engine/model/data/data-consumer';
import { DataLayer, type DataUpdateResponse, type SeriesChanges } from '@/lib/charting/engine/model/data/data-layer';
import { type SeriesPlotRow } from '@/lib/charting/engine/model/data/series-data';
import { type CustomData, type ICustomSeriesPaneView } from '@/lib/charting/engine/model/series/icustom-series';
import { type Series } from '@/lib/charting/engine/model/series/series';
import {
    type AreaSeriesPartialOptions,
    type BarSeriesPartialOptions,
    type BaselineSeriesPartialOptions,
    type CandlestickSeriesPartialOptions,
    type CustomSeriesOptions,
    type CustomSeriesPartialOptions,
    fillUpDownCandlesticksColors,
    type HistogramSeriesPartialOptions,
    type LineSeriesPartialOptions,
    precisionByMinMove,
    type PriceFormat,
    type PriceFormatBuiltIn,
    type SeriesOptionsMap,
    type SeriesPartialOptions,
    type SeriesPartialOptionsMap,
    type SeriesStyleOptionsMap,
    type SeriesType,
} from '@/lib/charting/engine/model/series/series-options';
import { type IHorzScaleBehavior } from '@/lib/charting/engine/model/time/ihorz-scale-behavior';
import { type Logical } from '@/lib/charting/engine/model/time/time-data';

export type IPriceScaleApiProvider<THorzScaleItem> = Pick<IChartApiBase<THorzScaleItem>, 'priceScale'>;

/** The shape of both per-axis switches under `handleScale`. */
type AxisSwitches = { time: boolean; price: boolean };

export class ChartApi<THorzScaleItem>
    implements IChartApiBase<THorzScaleItem>, DataUpdatesConsumer<SeriesType, THorzScaleItem>
{
    private _chartWidget: ChartWidget<THorzScaleItem>;
    private _dataLayer: DataLayer<THorzScaleItem>;
    private readonly _seriesMap = new Map<ISeriesApi<SeriesType, THorzScaleItem>, Series<SeriesType>>();
    private readonly _seriesMapReversed = new Map<Series<SeriesType>, SeriesApi<SeriesType, THorzScaleItem>>();

    private readonly _clickedDelegate = new Delegate<MouseEventParams<THorzScaleItem>>();
    private readonly _dblClickedDelegate = new Delegate<MouseEventParams<THorzScaleItem>>();
    private readonly _crosshairMovedDelegate = new Delegate<MouseEventParams<THorzScaleItem>>();

    private readonly _timeScaleApi: TimeScaleApi<THorzScaleItem>;

    private readonly _horzScaleBehavior: IHorzScaleBehavior<THorzScaleItem>;

    public constructor(
        container: HTMLElement,
        horzScaleBehavior: IHorzScaleBehavior<THorzScaleItem>,
        options?: DeepPartial<ChartOptionsImpl<THorzScaleItem>>,
    ) {
        this._dataLayer = new DataLayer<THorzScaleItem>(horzScaleBehavior);
        const internalOptions =
            options === undefined
                ? clone(chartOptionsDefaults<THorzScaleItem>())
                : merge(clone(chartOptionsDefaults<THorzScaleItem>()), toInternalOptions(options));

        this._horzScaleBehavior = horzScaleBehavior;
        this._chartWidget = new ChartWidget(container, internalOptions, horzScaleBehavior);

        this._chartWidget.clicked().subscribe(
            (paramSupplier: MouseEventParamsImplSupplier) => {
                if (this._clickedDelegate.hasListeners()) {
                    this._clickedDelegate.fire(this._convertMouseParams(paramSupplier()));
                }
            },
            { linkedObject: this },
        );
        this._chartWidget.dblClicked().subscribe(
            (paramSupplier: MouseEventParamsImplSupplier) => {
                if (this._dblClickedDelegate.hasListeners()) {
                    this._dblClickedDelegate.fire(this._convertMouseParams(paramSupplier()));
                }
            },
            { linkedObject: this },
        );
        this._chartWidget.crosshairMoved().subscribe(
            (paramSupplier: MouseEventParamsImplSupplier) => {
                if (this._crosshairMovedDelegate.hasListeners()) {
                    this._crosshairMovedDelegate.fire(this._convertMouseParams(paramSupplier()));
                }
            },
            { linkedObject: this },
        );

        const model = this._chartWidget.model();
        this._timeScaleApi = new TimeScaleApi(model, this._chartWidget.timeAxisWidget(), this._horzScaleBehavior);
    }

    public remove(): void {
        this._chartWidget.clicked().unsubscribeAll(this);
        this._chartWidget.dblClicked().unsubscribeAll(this);
        this._chartWidget.crosshairMoved().unsubscribeAll(this);

        this._timeScaleApi.destroy();
        this._chartWidget.destroy();

        this._seriesMap.clear();
        this._seriesMapReversed.clear();

        this._clickedDelegate.destroy();
        this._dblClickedDelegate.destroy();
        this._crosshairMovedDelegate.destroy();
        this._dataLayer.destroy();
    }

    public resize(width: number, height: number): void {
        // Rejected here rather than inside _chartWidget.resize, because the
        // observer's own resize calls are legitimate and go through that
        if (this.autoSizeActive()) {
            rejectOptions("Height and width are ignored while 'autoSize' is enabled — turn it off first");
        }
        this._chartWidget.resize(width, height);
    }

    public addCustomSeries<
        TData extends CustomData<THorzScaleItem>,
        TOptions extends CustomSeriesOptions,
        TPartialOptions extends CustomSeriesPartialOptions = SeriesPartialOptions<TOptions>,
    >(
        customPaneView: ICustomSeriesPaneView<THorzScaleItem, TData, TOptions>,
        options?: SeriesPartialOptions<TOptions>,
    ): ISeriesApi<'Custom', THorzScaleItem, TData, TOptions, TPartialOptions> {
        const paneView = getPresent(customPaneView);
        const defaults = {
            ...customStyleDefaults,
            ...paneView.defaultOptions(),
        };
        return this._addSeriesImpl<'Custom', TData, TOptions, TPartialOptions>({
            type: 'Custom',
            styleDefaults: defaults,
            options,
            customPaneView: paneView,
        });
    }

    public addAreaSeries(options?: AreaSeriesPartialOptions): ISeriesApi<'Area', THorzScaleItem> {
        return this._addSeriesImpl({ type: 'Area', styleDefaults: areaStyleDefaults, options });
    }

    public addBaselineSeries(options?: BaselineSeriesPartialOptions): ISeriesApi<'Baseline', THorzScaleItem> {
        return this._addSeriesImpl({ type: 'Baseline', styleDefaults: baselineStyleDefaults, options });
    }

    public addBarSeries(options?: BarSeriesPartialOptions): ISeriesApi<'Bar', THorzScaleItem> {
        return this._addSeriesImpl({ type: 'Bar', styleDefaults: barStyleDefaults, options });
    }

    public addCandlestickSeries(
        options: CandlestickSeriesPartialOptions = {},
    ): ISeriesApi<'Candlestick', THorzScaleItem> {
        fillUpDownCandlesticksColors(options);

        return this._addSeriesImpl({ type: 'Candlestick', styleDefaults: candlestickStyleDefaults, options });
    }

    public addHistogramSeries(options?: HistogramSeriesPartialOptions): ISeriesApi<'Histogram', THorzScaleItem> {
        return this._addSeriesImpl({ type: 'Histogram', styleDefaults: histogramStyleDefaults, options });
    }

    public addLineSeries(options?: LineSeriesPartialOptions): ISeriesApi<'Line', THorzScaleItem> {
        return this._addSeriesImpl({ type: 'Line', styleDefaults: lineStyleDefaults, options });
    }

    public removeSeries(seriesApi: SeriesApi<SeriesType, THorzScaleItem>): void {
        const series = getDefined(this._seriesMap.get(seriesApi));

        const update = this._dataLayer.removeSeries(series);
        const model = this._chartWidget.model();
        model.removeSeries(series);

        this._sendUpdateToChart(update);

        this._seriesMap.delete(seriesApi);
        this._seriesMapReversed.delete(series);
    }

    public applyNewData<TSeriesType extends SeriesType>(
        series: Series<TSeriesType>,
        data: SeriesDataItemTypeMap<THorzScaleItem>[TSeriesType][],
    ): void {
        this._sendUpdateToChart(this._dataLayer.setSeriesData(series, data));
    }

    public updateData<TSeriesType extends SeriesType>(
        series: Series<TSeriesType>,
        data: SeriesDataItemTypeMap<THorzScaleItem>[TSeriesType],
    ): void {
        this._sendUpdateToChart(this._dataLayer.updateSeriesData(series, data));
    }

    public subscribeClick(handler: MouseEventHandler<THorzScaleItem>): void {
        this._clickedDelegate.subscribe(handler);
    }

    public unsubscribeClick(handler: MouseEventHandler<THorzScaleItem>): void {
        this._clickedDelegate.unsubscribe(handler);
    }

    public subscribeCrosshairMove(handler: MouseEventHandler<THorzScaleItem>): void {
        this._crosshairMovedDelegate.subscribe(handler);
    }

    public unsubscribeCrosshairMove(handler: MouseEventHandler<THorzScaleItem>): void {
        this._crosshairMovedDelegate.unsubscribe(handler);
    }

    public subscribeDblClick(handler: MouseEventHandler<THorzScaleItem>): void {
        this._dblClickedDelegate.subscribe(handler);
    }

    public unsubscribeDblClick(handler: MouseEventHandler<THorzScaleItem>): void {
        this._dblClickedDelegate.unsubscribe(handler);
    }

    public priceScale(priceScaleId: string): IPriceScaleApi {
        return new PriceScaleApi(this._chartWidget, priceScaleId);
    }

    public timeScale(): ITimeScaleApi<THorzScaleItem> {
        return this._timeScaleApi;
    }

    public applyOptions(options: DeepPartial<ChartOptionsImpl<THorzScaleItem>>): void {
        this._chartWidget.applyOptions(toInternalOptions(options));
    }

    public options(): Readonly<ChartOptionsImpl<THorzScaleItem>> {
        return this._chartWidget.options();
    }

    public takeScreenshot(): HTMLCanvasElement {
        return this._chartWidget.takeScreenshot();
    }

    public autoSizeActive(): boolean {
        return this._chartWidget.autoSizeActive();
    }

    public chartElement(): HTMLDivElement {
        return this._chartWidget.element();
    }

    public paneSize(): PaneSize {
        const size = this._chartWidget.paneSize();
        return {
            height: size.height,
            width: size.width,
        };
    }

    public setCrosshairPosition(
        price: number,
        horizontalPosition: THorzScaleItem,
        seriesApi: ISeriesApi<SeriesType, THorzScaleItem>,
    ): void {
        const series = this._seriesMap.get(seriesApi);

        if (series === undefined) {
            return;
        }

        const pane = this._chartWidget.model().paneForSource(series);

        if (pane === null) {
            return;
        }

        this._chartWidget.model().placeCrosshairAt(price, horizontalPosition, pane);
    }

    public clearCrosshairPosition(): void {
        this._chartWidget.model().clearCurrentPosition(true);
    }

    private _addSeriesImpl<
        TSeries extends SeriesType,
        TData extends WhitespaceData<THorzScaleItem> = SeriesDataItemTypeMap<THorzScaleItem>[TSeries],
        TOptions extends SeriesOptionsMap[TSeries] = SeriesOptionsMap[TSeries],
        TPartialOptions extends SeriesPartialOptionsMap[TSeries] = SeriesPartialOptionsMap[TSeries],
    >(spec: {
        type: TSeries;
        styleDefaults: SeriesStyleOptionsMap[TSeries];
        options?: SeriesPartialOptionsMap[TSeries] | undefined;
        customPaneView?: ICustomSeriesPaneView<THorzScaleItem> | undefined;
    }): ISeriesApi<TSeries, THorzScaleItem, TData, TOptions, TPartialOptions> {
        const { type, styleDefaults, customPaneView } = spec;
        const options: SeriesPartialOptionsMap[TSeries] = spec.options ?? {};

        patchPriceFormat(options.priceFormat);

        // The common and per-type defaults share no key. Over a generic key TS reads an assignment to
        // `SeriesOptionsMap[TSeries]` as the intersection of every series' options, which none can be
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the common options plus TSeries' own style options are SeriesOptionsMap[TSeries] by that map's definition
        const strictOptions = merge(
            { ...clone(seriesOptionsDefaults), ...clone(styleDefaults) },
            options,
        ) as SeriesOptionsMap[TSeries];
        const series = this._chartWidget.model().createSeries(type, strictOptions, customPaneView);

        const res = new SeriesApi<TSeries, THorzScaleItem, TData, TOptions, TPartialOptions>(
            series,
            this,
            this,
            this,
            this._horzScaleBehavior,
        );
        this._seriesMap.set(res, series);
        this._seriesMapReversed.set(series, res);

        return res;
    }

    private _sendUpdateToChart(update: DataUpdateResponse): void {
        const model = this._chartWidget.model();

        model.updateTimeScale(update.timeScale);
        update.series.forEach((value: SeriesChanges, series: Series<SeriesType>) =>
            series.setData(value.data, value.info),
        );

        model.recalculateAllPanes();
    }

    private _mapSeriesToApi(series: Series<SeriesType>): ISeriesApi<SeriesType, THorzScaleItem> {
        return getDefined(this._seriesMapReversed.get(series));
    }

    private _convertMouseParams(param: MouseEventParamsImpl): MouseEventParams<THorzScaleItem> {
        const seriesData: MouseEventParams<THorzScaleItem>['seriesData'] = new Map();
        param.seriesData.forEach((plotRow: SeriesPlotRow<SeriesType>, series: Series<SeriesType>) => {
            const seriesType = series.seriesType();
            const data = getSeriesDataCreator<SeriesType, THorzScaleItem>(seriesType)(plotRow);
            if (seriesType !== 'Custom') {
                assert(isFulfilledData(data));
            } else {
                const customWhitespaceChecker = series.customSeriesWhitespaceCheck();
                assert(customWhitespaceChecker === undefined || customWhitespaceChecker(data) === false);
            }
            seriesData.set(this._mapSeriesToApi(series), data);
        });

        const hoveredSeries =
            param.hoveredSeries === undefined || !this._seriesMapReversed.has(param.hoveredSeries)
                ? undefined
                : this._mapSeriesToApi(param.hoveredSeries);

        return {
            time: param.originalTime === undefined ? undefined : callerType<THorzScaleItem>(param.originalTime),
            logical: param.index === undefined ? undefined : nominal<Logical>(param.index),
            point: param.point,
            hoveredSeries,
            hoveredObjectId: param.hoveredObject,
            seriesData,
            sourceEvent: param.touchMouseEventData,
        };
    }
}

function patchPriceFormat(priceFormat?: DeepPartial<PriceFormat>): void {
    if (priceFormat === undefined || !isBuiltInFormat(priceFormat)) {
        return;
    }
    if (priceFormat.minMove !== undefined && priceFormat.precision === undefined) {
        priceFormat.precision = precisionByMinMove(priceFormat.minMove);
    }
}

// The public options take one boolean for `handleScale` and `handleScroll` as shorthand for every switch
// either holds; the chart works only in the spelled-out form, built here without touching the caller's object
function toInternalOptions<THorzScaleItem>(
    options: DeepPartial<ChartOptionsImpl<THorzScaleItem>>,
): DeepPartial<ChartOptionsInternal<THorzScaleItem>> {
    const { handleScale, handleScroll, ...rest } = options;
    const internal: DeepPartial<ChartOptionsInternal<THorzScaleItem>> = rest;
    if (handleScale !== undefined) internal.handleScale = internalHandleScale(handleScale);
    if (handleScroll !== undefined) {
        internal.handleScroll = isBoolean(handleScroll)
            ? {
                  horzTouchDrag: handleScroll,
                  vertTouchDrag: handleScroll,
                  mouseWheel: handleScroll,
                  pressedMouseMove: handleScroll,
              }
            : handleScroll;
    }
    return internal;
}

function internalHandleScale(
    handleScale: NonNullable<DeepPartial<ChartOptionsImpl<unknown>>['handleScale']>,
): DeepPartial<ChartOptionsInternal<unknown>['handleScale']> {
    if (isBoolean(handleScale)) {
        return {
            axisDoubleClickReset: bothAxes(handleScale),
            axisPressedMouseMove: bothAxes(handleScale),
            mouseWheel: handleScale,
            pinch: handleScale,
        };
    }

    const { axisPressedMouseMove, axisDoubleClickReset, ...rest } = handleScale;
    const internal: DeepPartial<ChartOptionsInternal<unknown>['handleScale']> = rest;
    if (axisPressedMouseMove !== undefined) internal.axisPressedMouseMove = bothAxes(axisPressedMouseMove);
    if (axisDoubleClickReset !== undefined) internal.axisDoubleClickReset = bothAxes(axisDoubleClickReset);
    return internal;
}

function bothAxes(axes: boolean | DeepPartial<AxisSwitches>): DeepPartial<AxisSwitches> {
    return isBoolean(axes) ? { time: axes, price: axes } : axes;
}

function isBuiltInFormat(format: DeepPartial<PriceFormat>): format is DeepPartial<PriceFormatBuiltIn> {
    return format.type !== 'custom';
}
