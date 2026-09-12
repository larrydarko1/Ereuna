import { type Nominal } from '@/lib/lightweight-charts/helpers/nominal';

import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';

/**
 * Represents a price as a `number`.
 */
export type BarPrice = Nominal<number, 'BarPrice'>;

/**
 * Represents a bar's open, high, low, close (OHLC) prices.
 */
export type BarPrices = {
    /**
     * The open price.
     */
    open: BarPrice;
    /**
     * The high price.
     */
    high: BarPrice;
    /**
     * The low price.
     */
    low: BarPrice;
    /**
     * The close price.
     */
    close: BarPrice;
};

/**
 * Represents the y-axis coordinates of a bar's open, high, low, close prices.
 */
export type BarCoordinates = {
    openY: Coordinate;
    highY: Coordinate;
    lowY: Coordinate;
    closeY: Coordinate;
};
