import { type BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { type Point } from '@/lib/lightweight-charts/model/point';

import { BitmapCoordinatesPaneRenderer } from '@/lib/lightweight-charts/renderers/bitmap-coordinates-pane-renderer';

export type LastPriceCircleRendererData = {
    radius: number;
    fillColor: string;
    strokeColor: string;
    seriesLineColor: string;
    seriesLineWidth: number;
    center: Point;
};

export class SeriesLastPriceAnimationRenderer extends BitmapCoordinatesPaneRenderer {
    private _data: LastPriceCircleRendererData | null = null;

    public setData(data: LastPriceCircleRendererData | null): void {
        this._data = data;
    }

    public data(): LastPriceCircleRendererData | null {
        return this._data;
    }

    protected override _drawImpl({
        context: ctx,
        horizontalPixelRatio,
        verticalPixelRatio,
    }: BitmapCoordinatesRenderingScope): void {
        const data = this._data;
        if (data === null) {
            return;
        }

        const tickWidth = Math.max(1, Math.floor(horizontalPixelRatio));

        const correction = (tickWidth % 2) / 2;
        const centerX = Math.round(data.center.x * horizontalPixelRatio) + correction; // correct x coordinate only
        const centerY = data.center.y * verticalPixelRatio;

        ctx.fillStyle = data.seriesLineColor;
        ctx.beginPath();
        // Upstream note: horizontal and vertical radii would be better kept apart
        const centerPointRadius = Math.max(2, data.seriesLineWidth * 1.5) * horizontalPixelRatio;
        ctx.arc(centerX, centerY, centerPointRadius, 0, 2 * Math.PI, false);
        ctx.fill();

        ctx.fillStyle = data.fillColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, data.radius * horizontalPixelRatio, 0, 2 * Math.PI, false);
        ctx.fill();

        ctx.lineWidth = tickWidth;
        ctx.strokeStyle = data.strokeColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, data.radius * horizontalPixelRatio + tickWidth / 2, 0, 2 * Math.PI, false);
        ctx.stroke();
    }
}
