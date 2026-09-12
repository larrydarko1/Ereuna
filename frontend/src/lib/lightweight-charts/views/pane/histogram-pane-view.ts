import { getNotNull } from '@/lib/lightweight-charts/helpers/assertions';

import { type BarPrice } from '@/lib/lightweight-charts/model/bar';
import { type ISeriesBarColorer } from '@/lib/lightweight-charts/model/series-bar-colorer';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';
import {
    type HistogramItem,
    PaneRendererHistogram,
    type PaneRendererHistogramData,
} from '@/lib/lightweight-charts/renderers/histogram-renderer';

import { LinePaneViewBase } from '@/lib/lightweight-charts/views/pane/line-pane-view-base';

export class SeriesHistogramPaneView extends LinePaneViewBase<'Histogram', HistogramItem, PaneRendererHistogram> {
    protected readonly _renderer: PaneRendererHistogram = new PaneRendererHistogram();

    protected _createRawItem(
        time: TimePointIndex,
        price: BarPrice,
        colorer: ISeriesBarColorer<'Histogram'>,
    ): HistogramItem {
        return {
            ...this._createRawItemBase(time, price),
            ...colorer.barStyle(time),
        };
    }

    protected _prepareRendererData(): void {
        const data: PaneRendererHistogramData = {
            items: this._items,
            barSpacing: this._model.timeScale().barSpacing(),
            visibleRange: this._itemsVisibleRange,
            histogramBase: this._series
                .priceScale()
                .priceToCoordinate(this._series.options().base, getNotNull(this._series.firstValue()).value),
        };

        this._renderer.setData(data);
    }
}
