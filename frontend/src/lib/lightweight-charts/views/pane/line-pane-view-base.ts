import { undefinedIfNull } from '@/lib/lightweight-charts/helpers/strict-type-checks';

import { type BarPrice } from '@/lib/lightweight-charts/model/bar';
import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import { PlotRowValueIndex } from '@/lib/lightweight-charts/model/plot-data';
import { type PricedValue, type PriceScale } from '@/lib/lightweight-charts/model/price-scale';
import { type ISeries } from '@/lib/lightweight-charts/model/series';
import { type ISeriesBarColorer } from '@/lib/lightweight-charts/model/series-bar-colorer';
import { type SeriesPlotRow } from '@/lib/lightweight-charts/model/series-data';
import { type TimedValue, type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';
import { type ITimeScale } from '@/lib/lightweight-charts/model/time-scale';
import { type IPaneRenderer } from '@/lib/lightweight-charts/renderers/ipane-renderer';

import { SeriesPaneViewBase } from '@/lib/lightweight-charts/views/pane/series-pane-view-base';

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
