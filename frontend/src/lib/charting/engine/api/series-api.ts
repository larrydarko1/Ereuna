/**
 * The handle returned by every `add*Series` call.
 *
 * It holds no data of its own: reads go to the model's `Series` and writes go back
 * through the chart's data layer, so that one change can be applied to the time
 * scale and every other series in the same pass.
 */
import { type IPriceScaleApiProvider } from '@/lib/charting/engine/api/chart-api';
import { getSeriesDataCreator } from '@/lib/charting/engine/api/get-series-data-creator';
import { type IChartApiBase } from '@/lib/charting/engine/api/ichart-api';
import { type IPriceLine } from '@/lib/charting/engine/api/iprice-line';
import { type IPriceScaleApi } from '@/lib/charting/engine/api/iprice-scale-api';
import {
    type BarsInfo,
    type DataChangedHandler,
    type DataChangedScope,
    type ISeriesApi,
} from '@/lib/charting/engine/api/iseries-api';
import { type ISeriesPrimitive } from '@/lib/charting/engine/api/iseries-primitive-api';
import { priceLineOptionsDefaults } from '@/lib/charting/engine/api/options/price-line-options-defaults';
import { PriceLine } from '@/lib/charting/engine/api/price-line-api';
import { type IPriceFormatter } from '@/lib/charting/engine/formatters/iprice-formatter';
import { getNotNull } from '@/lib/charting/engine/helpers/assertions';
import { Delegate } from '@/lib/charting/engine/helpers/delegate';
import { type IDestroyable } from '@/lib/charting/engine/helpers/idestroyable';
import { clone, merge } from '@/lib/charting/engine/helpers/strict-type-checks';
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type BarPrice } from '@/lib/charting/engine/model/data/bar';
import {
    type DataUpdatesConsumer,
    type SeriesDataItemTypeMap,
    type WhitespaceData,
} from '@/lib/charting/engine/model/data/data-consumer';
import {
    checkItemsAreOrdered,
    checkPriceLineOptions,
    checkSeriesValuesType,
} from '@/lib/charting/engine/model/data/data-validators';
import { MismatchDirection } from '@/lib/charting/engine/model/data/plot-list';
import { type SeriesPlotRow } from '@/lib/charting/engine/model/data/series-data';
import {
    type CreatePriceLineOptions,
    type PriceLineOptions,
} from '@/lib/charting/engine/model/price/price-line-options';
import { RangeImpl } from '@/lib/charting/engine/model/range-impl';
import { type Series } from '@/lib/charting/engine/model/series/series';
import { convertSeriesMarker, type SeriesMarker } from '@/lib/charting/engine/model/series/series-markers';
import {
    type SeriesOptionsMap,
    type SeriesPartialOptionsMap,
    type SeriesType,
} from '@/lib/charting/engine/model/series/series-options';
import {
    type IHorzScaleBehavior,
    type InternalHorzScaleItem,
} from '@/lib/charting/engine/model/time/ihorz-scale-behavior';
import { type Logical, type Range, type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';
import { TimeScaleVisibleRange } from '@/lib/charting/engine/model/time/time-scale-visible-range';

export class SeriesApi<
    TSeriesType extends SeriesType,
    THorzScaleItem,
    TData extends WhitespaceData<THorzScaleItem> = SeriesDataItemTypeMap<THorzScaleItem>[TSeriesType],
    TOptions extends SeriesOptionsMap[TSeriesType] = SeriesOptionsMap[TSeriesType],
    TPartialOptions extends SeriesPartialOptionsMap[TSeriesType] = SeriesPartialOptionsMap[TSeriesType],
>
    implements ISeriesApi<TSeriesType, THorzScaleItem, TData, TOptions, TPartialOptions>, IDestroyable
{
    protected _series: Series<TSeriesType>;
    protected _dataUpdatesConsumer: DataUpdatesConsumer<TSeriesType, THorzScaleItem>;
    protected readonly _chartApi: IChartApiBase<THorzScaleItem>;

    private readonly _priceScaleApiProvider: IPriceScaleApiProvider<THorzScaleItem>;
    private readonly _horzScaleBehavior: IHorzScaleBehavior<THorzScaleItem>;
    private readonly _dataChangedDelegate = new Delegate<DataChangedScope>();

    public constructor(
        series: Series<TSeriesType>,
        dataUpdatesConsumer: DataUpdatesConsumer<TSeriesType, THorzScaleItem>,
        priceScaleApiProvider: IPriceScaleApiProvider<THorzScaleItem>,
        chartApi: IChartApiBase<THorzScaleItem>,
        horzScaleBehavior: IHorzScaleBehavior<THorzScaleItem>,
    ) {
        this._series = series;
        this._dataUpdatesConsumer = dataUpdatesConsumer;
        this._priceScaleApiProvider = priceScaleApiProvider;
        this._horzScaleBehavior = horzScaleBehavior;
        this._chartApi = chartApi;
    }

    public destroy(): void {
        this._dataChangedDelegate.destroy();
    }

    public priceFormatter(): IPriceFormatter {
        return this._series.formatter();
    }

    public priceToCoordinate(price: number): Coordinate | null {
        const firstValue = this._series.firstValue();
        if (firstValue === null) {
            return null;
        }

        return this._series.priceScale().priceToCoordinate(price, firstValue.value);
    }

    public coordinateToPrice(coordinate: number): BarPrice | null {
        const firstValue = this._series.firstValue();
        if (firstValue === null) {
            return null;
        }
        return this._series.priceScale().coordinateToPrice(coordinate as Coordinate, firstValue.value);
    }

    public barsInLogicalRange(range: Range<number> | null): BarsInfo<THorzScaleItem> | null {
        if (range === null) {
            return null;
        }

        // we use TimeScaleVisibleRange here to convert LogicalRange to strict range properly
        const correctedRange = new TimeScaleVisibleRange(
            new RangeImpl(range.from as Logical, range.to as Logical),
        ).strictRange() as RangeImpl<TimePointIndex>;

        const bars = this._series.bars();
        if (bars.isEmpty()) {
            return null;
        }

        const dataFirstBarInRange = bars.search(correctedRange.left(), MismatchDirection.NearestRight);
        const dataLastBarInRange = bars.search(correctedRange.right(), MismatchDirection.NearestLeft);

        const dataFirstIndex = getNotNull(bars.firstIndex());
        const dataLastIndex = getNotNull(bars.lastIndex());

        // this means that we request data in the data gap
        // e.g. let's say we have series with data [0..10, 30..60]
        // and we request bars info in range [15, 25]
        // thus, dataFirstBarInRange will be with index 30 and dataLastBarInRange with 10
        if (
            dataFirstBarInRange !== null &&
            dataLastBarInRange !== null &&
            dataFirstBarInRange.index > dataLastBarInRange.index
        ) {
            return {
                barsBefore: range.from - dataFirstIndex,
                barsAfter: dataLastIndex - range.to,
            };
        }

        const barsBefore =
            dataFirstBarInRange === null || dataFirstBarInRange.index === dataFirstIndex
                ? range.from - dataFirstIndex
                : dataFirstBarInRange.index - dataFirstIndex;

        const barsAfter =
            dataLastBarInRange === null || dataLastBarInRange.index === dataLastIndex
                ? dataLastIndex - range.to
                : dataLastIndex - dataLastBarInRange.index;

        const result: BarsInfo<THorzScaleItem> = { barsBefore, barsAfter };

        // actually they can't exist separately
        if (dataFirstBarInRange !== null && dataLastBarInRange !== null) {
            result.from = dataFirstBarInRange.originalTime as THorzScaleItem;
            result.to = dataLastBarInRange.originalTime as THorzScaleItem;
        }

        return result;
    }

    public setData(data: TData[]): void {
        checkItemsAreOrdered(data, this._horzScaleBehavior);
        checkSeriesValuesType(this._series.seriesType(), data);

        this._dataUpdatesConsumer.applyNewData(this._series, data);
        this._onDataChanged('full');
    }

    public update(bar: TData): void {
        checkSeriesValuesType(this._series.seriesType(), [bar]);

        this._dataUpdatesConsumer.updateData(this._series, bar);
        this._onDataChanged('update');
    }

    public dataByIndex(logicalIndex: number, mismatchDirection?: MismatchDirection): TData | null {
        const data = this._series.bars().search(logicalIndex as unknown as TimePointIndex, mismatchDirection);
        if (data === null) {
            // actually it can be a whitespace
            return null;
        }

        const creator = getSeriesDataCreator<TSeriesType, THorzScaleItem>(this.seriesType());
        return creator(data) as TData | null;
    }

    public data(): readonly TData[] {
        const seriesCreator = getSeriesDataCreator(this.seriesType());
        const rows = this._series.bars().rows();
        return rows.map((row: SeriesPlotRow<TSeriesType>) => seriesCreator(row) as TData);
    }

    public subscribeDataChanged(handler: DataChangedHandler): void {
        this._dataChangedDelegate.subscribe(handler);
    }

    public unsubscribeDataChanged(handler: DataChangedHandler): void {
        this._dataChangedDelegate.unsubscribe(handler);
    }

    public setMarkers(data: SeriesMarker<THorzScaleItem>[]): void {
        checkItemsAreOrdered(data, this._horzScaleBehavior, true);

        const convertedMarkers = data.map((marker: SeriesMarker<THorzScaleItem>) =>
            convertSeriesMarker<THorzScaleItem, InternalHorzScaleItem>(
                marker,
                this._horzScaleBehavior.convertHorzItemToInternal(marker.time),
                marker.time,
            ),
        );
        this._series.setMarkers(convertedMarkers);
    }

    public markers(): SeriesMarker<THorzScaleItem>[] {
        return this._series
            .markers()
            .map<SeriesMarker<THorzScaleItem>>((internalItem: SeriesMarker<InternalHorzScaleItem>) => {
                return convertSeriesMarker<InternalHorzScaleItem, THorzScaleItem>(
                    internalItem,
                    internalItem.originalTime as THorzScaleItem,
                    undefined,
                );
            });
    }

    public applyOptions(options: TPartialOptions): void {
        this._series.applyOptions(options);
    }

    public options(): Readonly<TOptions> {
        return clone(this._series.options() as TOptions);
    }

    public priceScale(): IPriceScaleApi {
        return this._priceScaleApiProvider.priceScale(this._series.priceScale().id());
    }

    public createPriceLine(options: CreatePriceLineOptions): IPriceLine {
        checkPriceLineOptions(options);

        const strictOptions = merge(clone(priceLineOptionsDefaults), options) as PriceLineOptions;
        const priceLine = this._series.createPriceLine(strictOptions);
        return new PriceLine(priceLine);
    }

    public removePriceLine(line: IPriceLine): void {
        this._series.removePriceLine((line as PriceLine).priceLine());
    }

    public seriesType(): TSeriesType {
        return this._series.seriesType();
    }

    public attachPrimitive(primitive: ISeriesPrimitive<THorzScaleItem>): void {
        // at this point we cast the generic to unknown because we
        // don't want the model to know the types of the API (◑_◑)
        this._series.attachPrimitive(primitive);
        if (primitive.attached !== undefined) {
            primitive.attached({
                chart: this._chartApi,
                series: this,
                requestUpdate: (): void => this._series.model().fullUpdate(),
            });
        }
    }

    public detachPrimitive(primitive: ISeriesPrimitive<THorzScaleItem>): void {
        this._series.detachPrimitive(primitive);
        if (primitive.detached !== undefined) {
            primitive.detached();
        }
    }

    private _onDataChanged(scope: DataChangedScope): void {
        if (this._dataChangedDelegate.hasListeners()) {
            this._dataChangedDelegate.fire(scope);
        }
    }
}
