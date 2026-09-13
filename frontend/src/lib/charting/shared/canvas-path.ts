/**
 * The canvas drawing the tools have in common, kept out of any one of them.
 */
import { type CanvasPoint } from '@/lib/charting/shared/geometry';

/**
 * Traces a rounded rectangle as the current path, leaving it to the caller to
 * fill or stroke it.
 *
 * `CanvasRenderingContext2D.roundRect` would do this natively, but it landed in
 * Safari 16 and the browserslist floor here is Safari 14.
 */
export function traceRoundedRect(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number; radius: number },
): void {
    const { x, y, width, height, radius } = bounds;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Draws one drag handle: a filled dot with the chart's own background punched
 * out of the middle, so it reads as a ring over whatever it sits on.
 *
 * The hole is painted rather than cut, which is why the caller has to pass the
 * background colour — a real `destination-out` composite would take the shape
 * underneath with it.
 */
export function drawHandle(
    ctx: CanvasRenderingContext2D,
    at: CanvasPoint,
    style: { radius: number; color: string; holeColor: string },
): void {
    const { radius, color, holeColor } = style;

    ctx.beginPath();
    ctx.arc(at.x, at.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = holeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(at.x, at.y, radius - 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = holeColor;
    ctx.fill();
}
