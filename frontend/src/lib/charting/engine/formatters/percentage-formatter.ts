/**
 * Formats a value as a percentage. It is a `PriceFormatter` with the sign
 * and the suffix fixed.
 */
import { PriceFormatter } from '@/lib/charting/engine/formatters/price-formatter';

export class PercentageFormatter extends PriceFormatter {
    public constructor(priceScale = 100) {
        // A percentage is shown to the same precision as a price, stepping by one
        super(priceScale, 1);
    }

    public override format(price: number): string {
        return `${super.format(price)}%`;
    }
}
