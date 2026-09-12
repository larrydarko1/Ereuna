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
