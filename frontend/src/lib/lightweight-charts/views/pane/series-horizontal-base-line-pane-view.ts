/**
 * The baseline series' base value, as a line across the pane.
 */
import { PriceScaleMode } from '@/lib/lightweight-charts/model/price-scale';
import { type ISeries } from '@/lib/lightweight-charts/model/series';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';

import { SeriesHorizontalLinePaneView } from '@/lib/lightweight-charts/views/pane/series-horizontal-line-pane-view';

export class SeriesHorizontalBaseLinePaneView extends SeriesHorizontalLinePaneView {
    public constructor(series: ISeries<SeriesType>) {
        super(series);
    }

    protected _updateImpl(): void {
        this._lineRendererData.visible = false;

        const priceScale = this._series.priceScale();
        const mode = priceScale.mode().mode;
        if (mode !== PriceScaleMode.Percentage && mode !== PriceScaleMode.IndexedTo100) {
            return;
        }

        const seriesOptions = this._series.options();

        if (!seriesOptions.baseLineVisible || !this._series.visible()) {
            return;
        }

        const firstValue = this._series.firstValue();
        if (firstValue === null) {
            return;
        }

        this._lineRendererData.visible = true;
        this._lineRendererData.y = priceScale.priceToCoordinate(firstValue.value, firstValue.value);
        this._lineRendererData.color = seriesOptions.baseLineColor;
        this._lineRendererData.lineWidth = seriesOptions.baseLineWidth;
        this._lineRendererData.lineStyle = seriesOptions.baseLineStyle;
    }
}
