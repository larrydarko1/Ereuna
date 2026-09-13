/**
 * Draws the crosshair's two lines across a pane.
 */
import { type BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { BitmapCoordinatesPaneRenderer } from '@/lib/lightweight-charts/renderers/bitmap-coordinates-pane-renderer';
import {
    drawHorizontalLine,
    drawVerticalLine,
    type LineStyle,
    type LineWidth,
    setLineStyle,
} from '@/lib/lightweight-charts/renderers/draw-line';

type CrosshairLineStyle = {
    lineStyle: LineStyle;
    lineWidth: LineWidth;
    color: string;
    visible: boolean;
};

export type CrosshairRendererData = {
    vertLine: CrosshairLineStyle;
    horzLine: CrosshairLineStyle;
    x: number;
    y: number;
};

export class CrosshairRenderer extends BitmapCoordinatesPaneRenderer {
    private readonly _data: CrosshairRendererData | null;

    public constructor(data: CrosshairRendererData | null) {
        super();
        this._data = data;
    }

    protected override _drawImpl({
        context: ctx,
        bitmapSize,
        horizontalPixelRatio,
        verticalPixelRatio,
    }: BitmapCoordinatesRenderingScope): void {
        if (this._data === null) {
            return;
        }

        const vertLinesVisible = this._data.vertLine.visible;
        const horzLinesVisible = this._data.horzLine.visible;

        if (!vertLinesVisible && !horzLinesVisible) {
            return;
        }

        const left = Math.round(this._data.x * horizontalPixelRatio);
        const top = Math.round(this._data.y * verticalPixelRatio);

        ctx.lineCap = 'butt';

        if (vertLinesVisible && left >= 0) {
            ctx.lineWidth = Math.floor(this._data.vertLine.lineWidth * horizontalPixelRatio);
            ctx.strokeStyle = this._data.vertLine.color;
            ctx.fillStyle = this._data.vertLine.color;
            setLineStyle(ctx, this._data.vertLine.lineStyle);
            drawVerticalLine(ctx, left, 0, bitmapSize.height);
        }

        if (horzLinesVisible && top >= 0) {
            ctx.lineWidth = Math.floor(this._data.horzLine.lineWidth * verticalPixelRatio);
            ctx.strokeStyle = this._data.horzLine.color;
            ctx.fillStyle = this._data.horzLine.color;
            setLineStyle(ctx, this._data.horzLine.lineStyle);
            drawHorizontalLine(ctx, top, 0, bitmapSize.width);
        }
    }
}
