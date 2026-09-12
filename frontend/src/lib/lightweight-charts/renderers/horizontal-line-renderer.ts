import { type BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { type HoveredObject } from '@/lib/lightweight-charts/model/chart-model';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';

import { BitmapCoordinatesPaneRenderer } from '@/lib/lightweight-charts/renderers/bitmap-coordinates-pane-renderer';
import {
    drawHorizontalLine,
    type LineStyle,
    type LineWidth,
    setLineStyle,
} from '@/lib/lightweight-charts/renderers/draw-line';

export type HorizontalLineRendererData = {
    color: string;
    lineStyle: LineStyle;
    lineWidth: LineWidth;

    y: Coordinate;
    visible?: boolean;
    externalId?: string | undefined;
}

const Constants = {
    HitTestThreshold: 7,
} as const;
type Constants = (typeof Constants)[keyof typeof Constants];

export class HorizontalLineRenderer extends BitmapCoordinatesPaneRenderer {
    private _data: HorizontalLineRendererData | null = null;

    public setData(data: HorizontalLineRendererData): void {
        this._data = data;
    }

    public hitTest(_x: Coordinate, y: Coordinate): HoveredObject | null {
        if (!this._data?.visible) {
            return null;
        }

        const { y: itemY, lineWidth, externalId } = this._data;
        // add a fixed area threshold around line (Y + width) for hit test
        if (
            y >= itemY - lineWidth - Constants.HitTestThreshold &&
            y <= itemY + lineWidth + Constants.HitTestThreshold
        ) {
            return {
                hitTestData: this._data,
                externalId: externalId,
            };
        }

        return null;
    }

    protected _drawImpl({
        context: ctx,
        bitmapSize,
        horizontalPixelRatio,
        verticalPixelRatio,
    }: BitmapCoordinatesRenderingScope): void {
        if (this._data === null) {
            return;
        }

        if (this._data.visible === false) {
            return;
        }

        const y = Math.round(this._data.y * verticalPixelRatio);
        if (y < 0 || y > bitmapSize.height) {
            return;
        }

        ctx.lineCap = 'butt';
        ctx.strokeStyle = this._data.color;
        ctx.lineWidth = Math.floor(this._data.lineWidth * horizontalPixelRatio);
        setLineStyle(ctx, this._data.lineStyle);
        drawHorizontalLine(ctx, y, 0, bitmapSize.width);
    }
}
