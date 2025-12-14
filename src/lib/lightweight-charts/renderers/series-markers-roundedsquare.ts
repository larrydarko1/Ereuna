import { Coordinate } from '../model/coordinate';

import { BitmapShapeItemCoordinates, shapeSize } from './series-markers-utils';

export function drawRoundedSquare(
    ctx: CanvasRenderingContext2D,
    coords: BitmapShapeItemCoordinates,
    size: number
): void {
    const squareSize = shapeSize('square', size);
    const halfSize = ((squareSize - 1) * coords.pixelRatio) / 2;
    const left = coords.x - halfSize;
    const top = coords.y - halfSize;
    const width = squareSize * coords.pixelRatio;
    const height = squareSize * coords.pixelRatio;
    const radius = Math.min(width, height) * 0.25; // 25% radius for rounded corners

    ctx.beginPath();
    ctx.moveTo(left + radius, top);
    ctx.lineTo(left + width - radius, top);
    ctx.quadraticCurveTo(left + width, top, left + width, top + radius);
    ctx.lineTo(left + width, top + height - radius);
    ctx.quadraticCurveTo(left + width, top + height, left + width - radius, top + height);
    ctx.lineTo(left + radius, top + height);
    ctx.quadraticCurveTo(left, top + height, left, top + height - radius);
    ctx.lineTo(left, top + radius);
    ctx.quadraticCurveTo(left, top, left + radius, top);
    ctx.closePath();
    ctx.fill();
}

export function hitTestRoundedSquare(
    centerX: Coordinate,
    centerY: Coordinate,
    size: number,
    x: Coordinate,
    y: Coordinate
): boolean {
    const squareSize = shapeSize('square', size);
    const halfSize = (squareSize - 1) / 2;
    const left = centerX - halfSize;
    const top = centerY - halfSize;

    return x >= left && x <= left + squareSize &&
        y >= top && y <= top + squareSize;
}
