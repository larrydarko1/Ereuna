/**
 * The OHLC bar series' view.
 */
import { type SeriesBarColorer } from '@/lib/charting/engine/model/series/series-bar-colorer';
import { type SeriesPlotRow } from '@/lib/charting/engine/model/data/series-data';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';
import { type BarItem, PaneRendererBars } from '@/lib/charting/engine/renderers/bars-renderer';

import { BarsPaneViewBase } from '@/lib/charting/engine/views/pane/bars-pane-view-base';

export class SeriesBarsPaneView extends BarsPaneViewBase<'Bar', BarItem, PaneRendererBars> {
    protected readonly _renderer: PaneRendererBars = new PaneRendererBars();

    protected _createRawItem(
        time: TimePointIndex,
        bar: SeriesPlotRow<SeriesType>,
        colorer: SeriesBarColorer<'Bar'>,
    ): BarItem {
        return {
            ...this._createDefaultItem(time, bar, colorer),
            ...colorer.barStyle(time),
        };
    }

    protected _prepareRendererData(): void {
        const barStyleProps = this._series.options();

        this._renderer.setData({
            bars: this._items,
            barSpacing: this._model.timeScale().barSpacing(),
            openVisible: barStyleProps.openVisible,
            thinBars: barStyleProps.thinBars,
            visibleRange: this._itemsVisibleRange,
        });
    }
}
