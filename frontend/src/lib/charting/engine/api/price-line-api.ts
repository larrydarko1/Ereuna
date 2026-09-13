/**
 * The handle returned by `createPriceLine`, wrapping the model's own
 * `CustomPriceLine`.
 */
import { type CustomPriceLine } from '@/lib/charting/engine/model/price/custom-price-line';
import { type PriceLineOptions } from '@/lib/charting/engine/model/price/price-line-options';

import { type IPriceLine } from '@/lib/charting/engine/api/iprice-line';

export class PriceLine implements IPriceLine {
    private readonly _priceLine: CustomPriceLine;

    public constructor(priceLine: CustomPriceLine) {
        this._priceLine = priceLine;
    }

    public applyOptions(options: Partial<PriceLineOptions>): void {
        this._priceLine.applyOptions(options);
    }
    public options(): Readonly<PriceLineOptions> {
        return this._priceLine.options();
    }

    public priceLine(): CustomPriceLine {
        return this._priceLine;
    }
}
