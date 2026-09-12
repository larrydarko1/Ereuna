import { type CustomPriceLine } from '@/lib/lightweight-charts/model/custom-price-line';
import { type ISeries } from '@/lib/lightweight-charts/model/series';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';

import { SeriesHorizontalLinePaneView } from '@/lib/lightweight-charts/views/pane/series-horizontal-line-pane-view';

export class CustomPriceLinePaneView extends SeriesHorizontalLinePaneView {
    private readonly _priceLine: CustomPriceLine;

    public constructor(series: ISeries<SeriesType>, priceLine: CustomPriceLine) {
        super(series);
        this._priceLine = priceLine;
    }

    protected _updateImpl(): void {
        const data = this._lineRendererData;
        data.visible = false;

        const lineOptions = this._priceLine.options();

        if (!this._series.visible() || !lineOptions.lineVisible) {
            return;
        }

        const coordinate = this._priceLine.yCoord();
        if (coordinate === null) {
            return;
        }

        data.visible = true;
        data.y = coordinate;
        data.color = lineOptions.color;
        data.lineWidth = lineOptions.lineWidth;
        data.lineStyle = lineOptions.lineStyle;
        data.externalId = this._priceLine.options().id;
    }
}
