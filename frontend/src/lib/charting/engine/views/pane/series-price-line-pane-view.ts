/**
 * The series' own last-price line.
 */
import { type ISeries } from '@/lib/charting/engine/model/series/series';
import { PriceLineSource, type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { SeriesHorizontalLinePaneView } from '@/lib/charting/engine/views/pane/series-horizontal-line-pane-view';

export class SeriesPriceLinePaneView extends SeriesHorizontalLinePaneView {
    public constructor(series: ISeries<SeriesType>) {
        super(series);
    }

    protected _updateImpl(): void {
        const data = this._lineRendererData;
        data.visible = false;

        const seriesOptions = this._series.options();
        if (!seriesOptions.priceLineVisible || !this._series.visible()) {
            return;
        }

        const lastValueData = this._series.lastValueData(seriesOptions.priceLineSource === PriceLineSource.LastBar);
        if (lastValueData.noData) {
            return;
        }

        data.visible = true;
        data.y = lastValueData.coordinate;
        data.color = this._series.priceLineColor(lastValueData.color);
        data.lineWidth = seriesOptions.priceLineWidth;
        data.lineStyle = seriesOptions.priceLineStyle;
    }
}
