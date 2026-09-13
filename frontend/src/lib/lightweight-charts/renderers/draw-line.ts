/**
 * Line styles and the primitives that draw a straight line in one.
 *
 * `strokeInPixel` shifts a line by half a pixel before stroking it: canvas strokes
 * straddle the path, so an odd-width line on a whole coordinate is drawn across
 * two pixels at half intensity unless it is nudged.
 */
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';

/**
 * Represents the width of a line.
 */
export type LineWidth = 1 | 2 | 3 | 4;

export type LineType = (typeof LineType)[keyof typeof LineType];

/**
 * A point on a line.
 */
export type LinePoint = {
    /**
     * The point's x coordinate.
     */
    x: Coordinate;
    /**
     * The point's y coordinate.
     */
    y: Coordinate;
};

export type LineStyle = (typeof LineStyle)[keyof typeof LineStyle];

/**
 * Represents the possible line types.
 */
export const LineType = {
    /**
     * A line.
     */
    Simple: 0,
    /**
     * A stepped line.
     */
    WithSteps: 1,
    /**
     * A curved line.
     */
    Curved: 2,
} as const;

/**
 * Represents the possible line styles.
 */
export const LineStyle = {
    /**
     * A solid line.
     */
    Solid: 0,
    /**
     * A dotted line.
     */
    Dotted: 1,
    /**
     * A dashed line.
     */
    Dashed: 2,
    /**
     * A dashed line with bigger dashes.
     */
    LargeDashed: 3,
    /**
     * A dotted line with more space between dots.
     */
    SparseDotted: 4,
} as const;

export function setLineStyle(ctx: CanvasRenderingContext2D, style: LineStyle): void {
    const dashPatterns = {
        [LineStyle.Solid]: [],
        [LineStyle.Dotted]: [ctx.lineWidth, ctx.lineWidth],
        [LineStyle.Dashed]: [2 * ctx.lineWidth, 2 * ctx.lineWidth],
        [LineStyle.LargeDashed]: [6 * ctx.lineWidth, 6 * ctx.lineWidth],
        [LineStyle.SparseDotted]: [ctx.lineWidth, 4 * ctx.lineWidth],
    };

    const dashPattern = dashPatterns[style];
    ctx.setLineDash(dashPattern);
}

export function drawHorizontalLine(ctx: CanvasRenderingContext2D, y: number, left: number, right: number): void {
    ctx.beginPath();
    const correction = ctx.lineWidth % 2 !== 0 ? 0.5 : 0;
    ctx.moveTo(left, y + correction);
    ctx.lineTo(right, y + correction);
    ctx.stroke();
}

export function drawVerticalLine(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number): void {
    ctx.beginPath();
    const correction = ctx.lineWidth % 2 !== 0 ? 0.5 : 0;
    ctx.moveTo(x + correction, top);
    ctx.lineTo(x + correction, bottom);
    ctx.stroke();
}

export function strokeInPixel(ctx: CanvasRenderingContext2D, drawFunction: () => void): void {
    ctx.save();
    if (ctx.lineWidth % 2 !== 0) {
        ctx.translate(0.5, 0.5);
    }
    drawFunction();
    ctx.restore();
}
