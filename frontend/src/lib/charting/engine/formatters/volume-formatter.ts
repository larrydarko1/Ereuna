/**
 * Formats a volume the way a trader reads one: thousands, millions and
 * billions with a suffix rather than a full number.
 */
import { type IPriceFormatter } from '@/lib/charting/engine/formatters/iprice-formatter';

export class VolumeFormatter implements IPriceFormatter {
    private readonly _precision: number;

    public constructor(precision: number) {
        this._precision = precision;
    }

    public format(vol: number): string {
        const sign = vol < 0 ? '-' : '';
        const size = Math.abs(vol);

        if (size < 995) {
            return sign + this._formatNumber(size);
        }
        if (size < 999995) {
            return `${sign}${this._formatNumber(size / 1000)}K`;
        }
        if (size < 999999995) {
            return `${sign}${this._formatNumber((1000 * Math.round(size / 1000)) / 1000000)}M`;
        }
        return `${sign}${this._formatNumber((1000000 * Math.round(size / 1000000)) / 1000000000)}B`;
    }

    private _formatNumber(value: number): string {
        let res: string;
        const priceScale = Math.pow(10, this._precision);
        const rounded = Math.round(value * priceScale) / priceScale;
        if (rounded >= 1e-15 && rounded < 1) {
            res = rounded.toFixed(this._precision).replace(/\.?0+$/, ''); // regex removes trailing zeroes
        } else {
            res = String(rounded);
        }
        return res.replace(/(\.[1-9]*)0+$/, (_e: string, p1: string): string => p1);
    }
}
