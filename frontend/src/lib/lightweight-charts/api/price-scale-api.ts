/**
 * The handle returned by `priceScale()`, wrapping one of the pane's scales.
 */
import { type IChartWidgetBase } from '@/lib/lightweight-charts/gui/chart-widget';

import { getNotNull } from '@/lib/lightweight-charts/helpers/assertions';
import { type DeepPartial } from '@/lib/lightweight-charts/helpers/strict-type-checks';

import { isDefaultPriceScale } from '@/lib/lightweight-charts/model/default-price-scale';
import { type PriceScale, type PriceScaleOptions } from '@/lib/lightweight-charts/model/price-scale';

import { type IPriceScaleApi } from '@/lib/lightweight-charts/api/iprice-scale-api';

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
