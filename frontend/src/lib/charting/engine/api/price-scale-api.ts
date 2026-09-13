/**
 * The handle returned by `priceScale()`, wrapping one of the pane's scales.
 */
import { type IChartWidgetBase } from '@/lib/charting/engine/gui/chart-widget';

import { getNotNull } from '@/lib/charting/engine/helpers/assertions';
import { type DeepPartial } from '@/lib/charting/engine/helpers/strict-type-checks';

import { isDefaultPriceScale } from '@/lib/charting/engine/model/price/default-price-scale';
import { type PriceScale, type PriceScaleOptions } from '@/lib/charting/engine/model/price/price-scale';

import { type IPriceScaleApi } from '@/lib/charting/engine/api/iprice-scale-api';

export class PriceScaleApi implements IPriceScaleApi {
    private _chartWidget: IChartWidgetBase;
    private readonly _priceScaleId: string;

    public constructor(chartWidget: IChartWidgetBase, priceScaleId: string) {
        this._chartWidget = chartWidget;
        this._priceScaleId = priceScaleId;
    }

    public applyOptions(options: DeepPartial<PriceScaleOptions>): void {
        this._chartWidget.model().applyPriceScaleOptions(this._priceScaleId, options);
    }

    public options(): Readonly<PriceScaleOptions> {
        return this._priceScale().options();
    }

    public width(): number {
        if (!isDefaultPriceScale(this._priceScaleId)) {
            return 0;
        }

        return this._chartWidget.getPriceAxisWidth(this._priceScaleId);
    }

    private _priceScale(): PriceScale {
        return getNotNull(this._chartWidget.model().findPriceScale(this._priceScaleId)).priceScale;
    }
}
