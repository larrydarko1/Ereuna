/**
 * A pixel position on a canvas, branded so it cannot be confused with a price
 * or an index.
 */
import { type Nominal } from '@/lib/charting/engine/helpers/nominal';

/**
 * Represents a coordiate as a `number`.
 */
export type Coordinate = Nominal<number, 'Coordinate'>;
