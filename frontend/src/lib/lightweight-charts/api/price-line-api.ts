/**
 * The handle returned by `createPriceLine`, wrapping the model's own
 * `CustomPriceLine`.
 */
import { type CustomPriceLine } from '@/lib/lightweight-charts/model/custom-price-line';
import { type PriceLineOptions } from '@/lib/lightweight-charts/model/price-line-options';

import { type IPriceLine } from '@/lib/lightweight-charts/api/iprice-line';

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
