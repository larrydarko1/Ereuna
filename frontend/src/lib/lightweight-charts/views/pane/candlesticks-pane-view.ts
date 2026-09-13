/**
 * The candlestick series' view.
 */
import { type SeriesBarColorer } from '@/lib/lightweight-charts/model/series-bar-colorer';
import { type SeriesPlotRow } from '@/lib/lightweight-charts/model/series-data';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';
import {
    type CandlestickItem,
    PaneRendererCandlesticks,
} from '@/lib/lightweight-charts/renderers/candlesticks-renderer';

import { BarsPaneViewBase } from '@/lib/lightweight-charts/views/pane/bars-pane-view-base';

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
