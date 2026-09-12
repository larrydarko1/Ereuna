import { ceiledOdd } from '@/lib/lightweight-charts/helpers/mathex';

import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';

import { hitTestSquare } from '@/lib/lightweight-charts/renderers/series-markers-square';
import { type BitmapShapeItemCoordinates, shapeSize } from '@/lib/lightweight-charts/renderers/series-markers-utils';

export function drawArrowUp(ctx: CanvasRenderingContext2D, coords: BitmapShapeItemCoordinates, size: number): void {
    drawArrow(ctx, coords, size, -1);
}

export function drawArrowDown(ctx: CanvasRenderingContext2D, coords: BitmapShapeItemCoordinates, size: number): void {
    drawArrow(ctx, coords, size, 1);
}

/**
 * Traces and fills the arrow. The two directions are the same seven points with
 * the vertical ones mirrored, which is what `verticalSign` flips.
 */
function drawArrow(
    ctx: CanvasRenderingContext2D,
    coords: BitmapShapeItemCoordinates,
    size: number,
    verticalSign: 1 | -1,
): void {
    const arrowSize = shapeSize('arrowUp', size);
    const halfArrowSize = ((arrowSize - 1) / 2) * coords.pixelRatio;
    const baseSize = ceiledOdd(size / 2);
    const halfBaseSize = ((baseSize - 1) / 2) * coords.pixelRatio;

    const tip = coords.y + verticalSign * halfArrowSize;
    const tail = coords.y - verticalSign * halfArrowSize;

    ctx.beginPath();
    ctx.moveTo(coords.x - halfArrowSize, coords.y);
    ctx.lineTo(coords.x, tip);
    ctx.lineTo(coords.x + halfArrowSize, coords.y);
    ctx.lineTo(coords.x + halfBaseSize, coords.y);
    ctx.lineTo(coords.x + halfBaseSize, tail);
    ctx.lineTo(coords.x - halfBaseSize, tail);
    ctx.lineTo(coords.x - halfBaseSize, coords.y);
    ctx.fill();
}

/**
 * Both arrows hit-test as the square that bounds them — close enough for a
 * marker a few pixels across, and what upstream shipped.
 */
export function hitTestArrow(
    centerX: Coordinate,
    centerY: Coordinate,
    size: number,
    x: Coordinate,
    y: Coordinate,
): boolean {
    return hitTestSquare(centerX, centerY, size, x, y);
}
