/**
 * A point in canvas coordinates.
 */
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';

/**
 * Represents a point on the chart.
 */
export type Point = {
    /**
     * The x coordinate.
     */
    readonly x: Coordinate;
    /**
     * The y coordinate.
     */
    readonly y: Coordinate;
};
