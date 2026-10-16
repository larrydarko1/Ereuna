/**
 * The base for the two OHLC views, holding the part that reads open, high,
 * low and close out of a plot row.
 */
import { nominal } from '@/lib/charting/engine/helpers/nominal';
import { undefinedIfNull } from '@/lib/charting/engine/helpers/strict-type-checks';
import { type IChartModelBase } from '@/lib/charting/engine/model/chart/chart-model';
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type BarPrice } from '@/lib/charting/engine/model/data/bar';
import { PlotRowValueIndex } from '@/lib/charting/engine/model/data/plot-data';
import { type SeriesPlotRow } from '@/lib/charting/engine/model/data/series-data';
import { type PriceScale } from '@/lib/charting/engine/model/price/price-scale';
import { type ISeries } from '@/lib/charting/engine/model/series/series';
import { type ISeriesBarColorer } from '@/lib/charting/engine/model/series/series-bar-colorer';
import { type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';
import { type ITimeScale } from '@/lib/charting/engine/model/time/time-scale';
import { type BarCandlestickItemBase } from '@/lib/charting/engine/renderers/bars-renderer';
import { type IPaneRenderer } from '@/lib/charting/engine/renderers/ipane-renderer';
import { SeriesPaneViewBase } from '@/lib/charting/engine/views/pane/series-pane-view-base';

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
            time,
            open: nominal<BarPrice>(bar.value[PlotRowValueIndex.Open]),
            high: nominal<BarPrice>(bar.value[PlotRowValueIndex.High]),
            low: nominal<BarPrice>(bar.value[PlotRowValueIndex.Low]),
            close: nominal<BarPrice>(bar.value[PlotRowValueIndex.Close]),
            x: nominal<Coordinate>(NaN),
            openY: nominal<Coordinate>(NaN),
            highY: nominal<Coordinate>(NaN),
            lowY: nominal<Coordinate>(NaN),
            closeY: nominal<Coordinate>(NaN),
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
