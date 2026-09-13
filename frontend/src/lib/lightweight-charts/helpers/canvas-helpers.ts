/**
 * Canvas drawing the renderers share: inner borders, rounded rectangles and
 * the gradient clear the watermark needs.
 *
 * `drawRoundRect` is written out by hand because `CanvasRenderingContext2D.roundRect`
 * landed in Safari 16 and the browserslist floor here is Safari 14.
 */
type LeftTopRightTopRightBottomLeftBottomRadii = [number, number, number, number];

export type RoundRectBox = {
    left: number;
    top: number;
    width: number;
    height: number;

    // The radius of each corner of the OUTER edge, clockwise from the top-left
    outerRadius: LeftTopRightTopRightBottomLeftBottomRadii;
};

export type RoundRectStyle = {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
};

/**
 * Fills rectangle's inner border (so, all the filled area is limited by the [x, x + width]*[y, y + height] region)
 * ```
 * (x, y)
 * O***********************|*****
 * |        border         |  ^
 * |   *****************   |  |
 * |   |               |   |  |
 * | b |               | b |  h
 * | o |               | o |  e
 * | r |               | r |  i
 * | d |               | d |  g
 * | e |               | e |  h
 * | r |               | r |  t
 * |   |               |   |  |
 * |   *****************   |  |
 * |        border         |  v
 * |***********************|*****
 * |                       |
 * |<------- width ------->|
 * ```
 *
 * @param ctx - Context to draw on
 * @param x - Left side of the target rectangle
 * @param y - Top side of the target rectangle
 * @param width - Width of the target rectangle
 * @param height - Height of the target rectangle
 * @param borderWidth - Width of border to fill, must be less than width and height of the target rectangle
 */
export function fillRectInnerBorder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    borderWidth: number,
): void {
    // horizontal (top and bottom) edges
    ctx.fillRect(x + borderWidth, y, width - borderWidth * 2, borderWidth);
    ctx.fillRect(x + borderWidth, y + height - borderWidth, width - borderWidth * 2, borderWidth);
    // vertical (left and right) edges
    ctx.fillRect(x, y, borderWidth, height);
    ctx.fillRect(x + width - borderWidth, y, borderWidth, height);
}

export function clearRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    clearColor: string,
): void {
    ctx.save();
    ctx.globalCompositeOperation = 'copy';
    ctx.fillStyle = clearColor;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
}

export function drawRoundRectWithBorder(ctx: CanvasRenderingContext2D, box: RoundRectBox, style: RoundRectStyle): void {
    const { left, top, width, height, outerRadius } = box;
    const { backgroundColor, borderColor, borderWidth } = style;

    ctx.save();

    // Nothing to inset for: with no border, or one the same colour as the fill,
    // the whole shape is one solid area
    if (borderWidth === 0 || borderColor === '' || borderColor === backgroundColor) {
        drawRoundRect(ctx, left, top, width, height, outerRadius);
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        ctx.restore();
        return;
    }

    const halfBorderWidth = borderWidth / 2;
    const radii = changeBorderRadius(outerRadius, -halfBorderWidth);

    drawRoundRect(ctx, left + halfBorderWidth, top + halfBorderWidth, width - borderWidth, height - borderWidth, radii);

    if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fill();
    }

    if (borderColor !== 'transparent') {
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = borderColor;
        ctx.closePath();
        ctx.stroke();
    }

    ctx.restore();
}

export function clearRectWithGradient(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; width: number; height: number },
    colors: { topColor: string; bottomColor: string },
): void {
    ctx.save();

    ctx.globalCompositeOperation = 'copy';
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, colors.topColor);
    gradient.addColorStop(1, colors.bottomColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    ctx.restore();
}

function changeBorderRadius(
    borderRadius: LeftTopRightTopRightBottomLeftBottomRadii,
    offset: number,
): typeof borderRadius {
    return borderRadius.map((x: number) => (x === 0 ? x : x + offset)) as typeof borderRadius;
}

function drawRoundRect(
    // eslint:disable-next-line:max-params
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radii: LeftTopRightTopRightBottomLeftBottomRadii,
): void {
    /**
     * As of May 2023, all of the major browsers now support ctx.roundRect() so we should
     * be able to switch to the native version soon.
     */
    ctx.beginPath();

    // `CanvasRenderingContext2D.roundRect` landed in Safari 16 and the
    // browserslist floor here is Safari 14, so the type claiming it is always
    // present is a lie on the oldest browser this ships to — hence the trace below
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, radii);
        return;
    }

    ctx.lineTo(x + w - radii[1], y);
    if (radii[1] !== 0) {
        ctx.arcTo(x + w, y, x + w, y + radii[1], radii[1]);
    }

    ctx.lineTo(x + w, y + h - radii[2]);
    if (radii[2] !== 0) {
        ctx.arcTo(x + w, y + h, x + w - radii[2], y + h, radii[2]);
    }

    ctx.lineTo(x + radii[3], y + h);
    if (radii[3] !== 0) {
        ctx.arcTo(x, y + h, x, y + h - radii[3], radii[3]);
    }

    ctx.lineTo(x, y + radii[0]);
    if (radii[0] !== 0) {
        ctx.arcTo(x, y, x + radii[0], y, radii[0]);
    }
}
