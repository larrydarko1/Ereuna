/**
 * A custom price line's label on the axis.
 */
import { generateContrastColors } from '@/lib/lightweight-charts/helpers/color';

import { type CustomPriceLine } from '@/lib/lightweight-charts/model/custom-price-line';
import { type ISeries } from '@/lib/lightweight-charts/model/series';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';
import {
    type PriceAxisViewRendererCommonData,
    type PriceAxisViewRendererData,
} from '@/lib/lightweight-charts/renderers/iprice-axis-view-renderer';

import { PriceAxisView } from '@/lib/lightweight-charts/views/price-axis/price-axis-view';

export class CustomPriceLinePriceAxisView extends PriceAxisView {
    private readonly _series: ISeries<SeriesType>;
    private readonly _priceLine: CustomPriceLine;

    public constructor(series: ISeries<SeriesType>, priceLine: CustomPriceLine) {
        super();
        this._series = series;
        this._priceLine = priceLine;
    }

    protected _updateRendererData(
        axisRendererData: PriceAxisViewRendererData,
        paneRendererData: PriceAxisViewRendererData,
        commonData: PriceAxisViewRendererCommonData,
    ): void {
        axisRendererData.visible = false;
        paneRendererData.visible = false;

        const options = this._priceLine.options();
        const labelVisible = options.axisLabelVisible;
        const showPaneLabel = options.title !== '';

        const series = this._series;

        if (!labelVisible || !series.visible()) {
            return;
        }

        const coordinate = this._priceLine.yCoord();
        if (coordinate === null) {
            return;
        }

        if (showPaneLabel) {
            paneRendererData.text = options.title;
            paneRendererData.visible = true;
        }

        paneRendererData.borderColor = series
            .model()
            .backgroundColorAtYPercentFromTop(coordinate / series.priceScale().height());

        axisRendererData.text = this._formatPrice(options.price);
        axisRendererData.visible = true;

        const colors = generateContrastColors(options.axisLabelColor === '' ? options.color : options.axisLabelColor);
        commonData.background = colors.background;

        const textColor = options.axisLabelTextColor === '' ? colors.foreground : options.axisLabelTextColor;
        axisRendererData.color = textColor; // price text
        paneRendererData.color = textColor; // title text

        commonData.coordinate = coordinate;
    }

    private _formatPrice(price: number): string {
        const firstValue = this._series.firstValue();
        if (firstValue === null) {
            return '';
        }

        return this._series.priceScale().formatPrice(price, firstValue.value);
    }
}
