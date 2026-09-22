/**
 * The crosshair's label on a price axis.
 */
import { generateContrastColors } from '@/lib/charting/engine/helpers/color';
import {
    type Crosshair,
    CrosshairMode,
    type CrosshairPriceAndCoordinate,
} from '@/lib/charting/engine/model/chart/crosshair';
import { type PriceScale } from '@/lib/charting/engine/model/price/price-scale';
import {
    type PriceAxisViewRendererCommonData,
    type PriceAxisViewRendererData,
} from '@/lib/charting/engine/renderers/iprice-axis-view-renderer';
import { PriceAxisView } from '@/lib/charting/engine/views/price-axis/price-axis-view';

export type CrosshairPriceAxisViewValueProvider = (priceScale: PriceScale) => CrosshairPriceAndCoordinate;

export class CrosshairPriceAxisView extends PriceAxisView {
    private _source: Crosshair;
    private readonly _priceScale: PriceScale;
    private readonly _valueProvider: CrosshairPriceAxisViewValueProvider;

    public constructor(source: Crosshair, priceScale: PriceScale, valueProvider: CrosshairPriceAxisViewValueProvider) {
        super();
        this._source = source;
        this._priceScale = priceScale;
        this._valueProvider = valueProvider;
    }

    protected _updateRendererData(
        axisRendererData: PriceAxisViewRendererData,
        _paneRendererData: PriceAxisViewRendererData,
        commonRendererData: PriceAxisViewRendererCommonData,
    ): void {
        axisRendererData.visible = false;
        if (this._source.options().mode === CrosshairMode.Hidden) {
            return;
        }

        const options = this._source.options().horzLine;
        if (!options.labelVisible) {
            return;
        }

        const firstValue = this._priceScale.firstValue();
        if (!this._source.visible() || this._priceScale.isEmpty() || firstValue === null) {
            return;
        }

        const colors = generateContrastColors(options.labelBackgroundColor);
        commonRendererData.background = colors.background;
        axisRendererData.color = colors.foreground;

        const additionalPadding = (2 / 12) * this._priceScale.fontSize();

        commonRendererData.additionalPaddingTop = additionalPadding;
        commonRendererData.additionalPaddingBottom = additionalPadding;

        const value = this._valueProvider(this._priceScale);
        commonRendererData.coordinate = value.coordinate;
        axisRendererData.text = this._priceScale.formatPrice(value.price, firstValue);
        axisRendererData.visible = true;
    }
}
