/**
 * The base for the views that draw a single value per bar.
 */
import { undefinedIfNull } from '@/lib/charting/engine/helpers/strict-type-checks';
import { type IChartModelBase } from '@/lib/charting/engine/model/chart/chart-model';
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type BarPrice } from '@/lib/charting/engine/model/data/bar';
import { PlotRowValueIndex } from '@/lib/charting/engine/model/data/plot-data';
import { type SeriesPlotRow } from '@/lib/charting/engine/model/data/series-data';
import { type PricedValue, type PriceScale } from '@/lib/charting/engine/model/price/price-scale';
import { type ISeries } from '@/lib/charting/engine/model/series/series';
import { type ISeriesBarColorer } from '@/lib/charting/engine/model/series/series-bar-colorer';
import { type TimedValue, type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';
import { type ITimeScale } from '@/lib/charting/engine/model/time/time-scale';
import { type IPaneRenderer } from '@/lib/charting/engine/renderers/ipane-renderer';
import { SeriesPaneViewBase } from '@/lib/charting/engine/views/pane/series-pane-view-base';

export abstract class LinePaneViewBase<
    TSeriesType extends 'Line' | 'Area' | 'Baseline' | 'Histogram',
    TItemType extends PricedValue & TimedValue,
    TRenderer extends IPaneRenderer,
> extends SeriesPaneViewBase<TSeriesType, TItemType, TRenderer> {
    public constructor(series: ISeries<TSeriesType>, model: IChartModelBase) {
        super(series, model, { extendedVisibleRange: true });
    }

    protected _convertToCoordinates(priceScale: PriceScale, timeScale: ITimeScale, firstValue: number): void {
        timeScale.indexesToCoordinates(this._items, undefinedIfNull(this._itemsVisibleRange));
        priceScale.pointsArrayToCoordinates(this._items, firstValue, undefinedIfNull(this._itemsVisibleRange));
    }

    protected abstract _createRawItem(
        time: TimePointIndex,
        price: BarPrice,
        colorer: ISeriesBarColorer<TSeriesType>,
    ): TItemType;

    protected _createRawItemBase(time: TimePointIndex, price: BarPrice): PricedValue & TimedValue {
        return {
            time: time,
            price: price,
            x: NaN as Coordinate,
            y: NaN as Coordinate,
        };
    }

    protected _fillRawPoints(): void {
        const colorer = this._series.barColorer();
        this._items = this._series
            .bars()
            .rows()
            .map((row: SeriesPlotRow<TSeriesType>) => {
                const value = row.value[PlotRowValueIndex.Close] as BarPrice;
                return this._createRawItem(row.index, value, colorer);
            });
    }
}
