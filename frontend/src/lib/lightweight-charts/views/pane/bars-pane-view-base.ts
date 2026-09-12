import { undefinedIfNull } from '@/lib/lightweight-charts/helpers/strict-type-checks';

import { type BarPrice } from '@/lib/lightweight-charts/model/bar';
import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import { PlotRowValueIndex } from '@/lib/lightweight-charts/model/plot-data';
import { type PriceScale } from '@/lib/lightweight-charts/model/price-scale';
import { type ISeries } from '@/lib/lightweight-charts/model/series';
import { type ISeriesBarColorer } from '@/lib/lightweight-charts/model/series-bar-colorer';
import { type SeriesPlotRow } from '@/lib/lightweight-charts/model/series-data';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';
import { type ITimeScale } from '@/lib/lightweight-charts/model/time-scale';
import { type BarCandlestickItemBase } from '@/lib/lightweight-charts/renderers/bars-renderer';
import { type IPaneRenderer } from '@/lib/lightweight-charts/renderers/ipane-renderer';

import { SeriesPaneViewBase } from '@/lib/lightweight-charts/views/pane/series-pane-view-base';

export abstract class BarsPaneViewBase<
    TSeriesType extends 'Bar' | 'Candlestick',
    TItemType extends BarCandlestickItemBase,
    TRenderer extends IPaneRenderer,
> extends SeriesPaneViewBase<TSeriesType, TItemType, TRenderer> {
    public constructor(series: ISeries<TSeriesType>, model: IChartModelBase) {
        super(series, model, { extendedVisibleRange: false });
    }

    protected _convertToCoordinates(priceScale: PriceScale, timeScale: ITimeScale, firstValue: number): void {
        timeScale.indexesToCoordinates(this._items, undefinedIfNull(this._itemsVisibleRange));
        priceScale.barPricesToCoordinates(this._items, firstValue, undefinedIfNull(this._itemsVisibleRange));
    }

    protected abstract _createRawItem(
        time: TimePointIndex,
        bar: SeriesPlotRow<TSeriesType>,
        colorer: ISeriesBarColorer<TSeriesType>,
    ): TItemType;

    protected _createDefaultItem(
        time: TimePointIndex,
        bar: SeriesPlotRow<TSeriesType>,
        _colorer: ISeriesBarColorer<TSeriesType>,
    ): BarCandlestickItemBase {
        return {
            time: time,
            open: bar.value[PlotRowValueIndex.Open] as BarPrice,
            high: bar.value[PlotRowValueIndex.High] as BarPrice,
            low: bar.value[PlotRowValueIndex.Low] as BarPrice,
            close: bar.value[PlotRowValueIndex.Close] as BarPrice,
            x: NaN as Coordinate,
            openY: NaN as Coordinate,
            highY: NaN as Coordinate,
            lowY: NaN as Coordinate,
            closeY: NaN as Coordinate,
        };
    }

    protected _fillRawPoints(): void {
        const colorer = this._series.barColorer();

        this._items = this._series
            .bars()
            .rows()
            .map((row: SeriesPlotRow<TSeriesType>) => this._createRawItem(row.index, row, colorer));
    }
}
