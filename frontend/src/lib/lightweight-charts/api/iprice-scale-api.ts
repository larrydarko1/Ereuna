import { type DeepPartial } from '@/lib/lightweight-charts/helpers/strict-type-checks';

import { type PriceScaleOptions } from '@/lib/lightweight-charts/model/price-scale';

/** Interface to control chart's price scale */
export interface IPriceScaleApi {
    /**
     * Applies new options to the price scale
     *
     * @param options - Any subset of options.
     */
    applyOptions(options: DeepPartial<PriceScaleOptions>): void;

    /**
     * Returns currently applied options of the price scale
     *
     * @returns Full set of currently applied options, including defaults
     */
    options(): Readonly<PriceScaleOptions>;

    /**
     * Returns a width of the price scale if it's visible or 0 if invisible.
     */
    width(): number;
}
