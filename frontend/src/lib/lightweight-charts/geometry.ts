/**
 * A position on a drawing tool's overlay canvas, in CSS pixels from its
 * top-left corner. Not a `Coordinate` — the chart's own branded type is what
 * comes back from the scales, and these are what the pointer reports.
 */
export type CanvasPoint = { x: number; y: number };

/**
 * Distance from a point to the segment, not to the infinite line it lies on.
 *
 * Every drawing tool hit-tests this way: a click past either end of a stroke
 * should miss it however close it is to the line that stroke sits on.
 */
export function distanceToSegment(point: CanvasPoint, from: CanvasPoint, to: CanvasPoint): number {
    const runX = to.x - from.x;
    const runY = to.y - from.y;
    const lengthSquared = runX * runX + runY * runY;

    // A zero-length segment is a point, and every projection onto it lands there
    const projection =
        lengthSquared === 0 ? 0 : ((point.x - from.x) * runX + (point.y - from.y) * runY) / lengthSquared;
    const clamped = Math.min(1, Math.max(0, projection));

    return Math.hypot(point.x - (from.x + clamped * runX), point.y - (from.y + clamped * runY));
}
