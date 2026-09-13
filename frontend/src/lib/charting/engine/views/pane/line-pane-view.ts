/**
 * The line series' view.
 */
import { type BarPrice } from '@/lib/charting/engine/model/data/bar';
import { type ISeriesBarColorer } from '@/lib/charting/engine/model/series/series-bar-colorer';
import { type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';
import {
    type LineStrokeItem,
    PaneRendererLine,
    type PaneRendererLineData,
} from '@/lib/charting/engine/renderers/line-renderer';

import { LinePaneViewBase } from '@/lib/charting/engine/views/pane/line-pane-view-base';

export class SeriesLinePaneView extends LinePaneViewBase<'Line', LineStrokeItem, PaneRendererLine> {
    protected readonly _renderer: PaneRendererLine = new PaneRendererLine();

    protected _createRawItem(
        time: TimePointIndex,
        price: BarPrice,
        colorer: ISeriesBarColorer<'Line'>,
    ): LineStrokeItem {
        return {
            ...this._createRawItemBase(time, price),
            ...colorer.barStyle(time),
        };
    }

    protected _prepareRendererData(): void {
        const options = this._series.options();

        const data: PaneRendererLineData = {
            items: this._items,
            lineStyle: options.lineStyle,
            lineType: options.lineVisible ? options.lineType : undefined,
            lineWidth: options.lineWidth,
            pointMarkersRadius: options.pointMarkersVisible
                ? (options.pointMarkersRadius ?? options.lineWidth / 2 + 2)
                : undefined,
            visibleRange: this._itemsVisibleRange,
            barWidth: this._model.timeScale().barSpacing(),
        };

        this._renderer.setData(data);
    }
}
