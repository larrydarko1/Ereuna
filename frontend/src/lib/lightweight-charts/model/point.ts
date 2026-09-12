import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';

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
