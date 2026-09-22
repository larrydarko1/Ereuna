/**
 * The candlestick series' view.
 */
import { type SeriesPlotRow } from '@/lib/charting/engine/model/data/series-data';
import { type SeriesBarColorer } from '@/lib/charting/engine/model/series/series-bar-colorer';
import { type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';
import { type CandlestickItem, PaneRendererCandlesticks } from '@/lib/charting/engine/renderers/candlesticks-renderer';
import { BarsPaneViewBase } from '@/lib/charting/engine/views/pane/bars-pane-view-base';

export class SeriesCandlesticksPaneView extends BarsPaneViewBase<
    'Candlestick',
    CandlestickItem,
    PaneRendererCandlesticks
> {
    protected readonly _renderer: PaneRendererCandlesticks = new PaneRendererCandlesticks();

    protected _createRawItem(
        time: TimePointIndex,
        bar: SeriesPlotRow<'Candlestick'>,
        colorer: SeriesBarColorer<'Candlestick'>,
    ): CandlestickItem {
        return {
            ...this._createDefaultItem(time, bar, colorer),
            ...colorer.barStyle(time),
        };
    }

    protected _prepareRendererData(): void {
        const candlestickStyleProps = this._series.options();

        this._renderer.setData({
            bars: this._items,
            barSpacing: this._model.timeScale().barSpacing(),
            wickVisible: candlestickStyleProps.wickVisible,
            borderVisible: candlestickStyleProps.borderVisible,
            visibleRange: this._itemsVisibleRange,
        });
    }
}
