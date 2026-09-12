import { ceiledOdd } from '@/lib/lightweight-charts/helpers/mathex';

import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';

import { hitTestSquare } from '@/lib/lightweight-charts/renderers/series-markers-square';
import { type BitmapShapeItemCoordinates, shapeSize } from '@/lib/lightweight-charts/renderers/series-markers-utils';

export function drawArrow(
    up: boolean,
    ctx: CanvasRenderingContext2D,
    coords: BitmapShapeItemCoordinates,
    size: number,
): void {
    const arrowSize = shapeSize('arrowUp', size);
    const halfArrowSize = ((arrowSize - 1) / 2) * coords.pixelRatio;
    const baseSize = ceiledOdd(size / 2);
    const halfBaseSize = ((baseSize - 1) / 2) * coords.pixelRatio;

    ctx.beginPath();
    if (up) {
        ctx.moveTo(coords.x - halfArrowSize, coords.y);
        ctx.lineTo(coords.x, coords.y - halfArrowSize);
        ctx.lineTo(coords.x + halfArrowSize, coords.y);
        ctx.lineTo(coords.x + halfBaseSize, coords.y);
        ctx.lineTo(coords.x + halfBaseSize, coords.y + halfArrowSize);
        ctx.lineTo(coords.x - halfBaseSize, coords.y + halfArrowSize);
        ctx.lineTo(coords.x - halfBaseSize, coords.y);
    } else {
        ctx.moveTo(coords.x - halfArrowSize, coords.y);
        ctx.lineTo(coords.x, coords.y + halfArrowSize);
        ctx.lineTo(coords.x + halfArrowSize, coords.y);
        ctx.lineTo(coords.x + halfBaseSize, coords.y);
        ctx.lineTo(coords.x + halfBaseSize, coords.y - halfArrowSize);
        ctx.lineTo(coords.x - halfBaseSize, coords.y - halfArrowSize);
        ctx.lineTo(coords.x - halfBaseSize, coords.y);
    }

    ctx.fill();
}

export function hitTestArrow(
    _up: boolean,
    centerX: Coordinate,
    centerY: Coordinate,
    size: number,
    x: Coordinate,
    y: Coordinate,
): boolean {
    // TODO: implement arrow hit test
    return hitTestSquare(centerX, centerY, size, x, y);
}
