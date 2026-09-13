/**
 * The two formatter shapes a caller may supply for prices and percentages.
 */
import { type BarPrice } from '@/lib/charting/engine/model/data/bar';

/**
 * A function used to format a {@link BarPrice} as a string.
 */
export type PriceFormatterFn = (priceValue: BarPrice) => string;

/**
 * A function used to format a percentage value as a string.
 */
export type PercentageFormatterFn = (percentageValue: number) => string;
