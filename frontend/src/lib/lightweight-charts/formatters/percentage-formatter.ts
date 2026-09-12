import { PriceFormatter } from '@/lib/lightweight-charts/formatters/price-formatter';

export class PercentageFormatter extends PriceFormatter {
    public constructor(priceScale: number = 100) {
        super(priceScale);
    }

    public override format(price: number): string {
        return `${super.format(price)}%`;
    }
}
