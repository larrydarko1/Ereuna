/**
 * Draws the grid lines at the marks both scales supply.
 */
import { type BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { getNotNull } from '@/lib/charting/engine/helpers/assertions';
import { type PriceMark } from '@/lib/charting/engine/model/price/price-scale';
import { BitmapCoordinatesPaneRenderer } from '@/lib/charting/engine/renderers/bitmap-coordinates-pane-renderer';
import { type LineStyle, setLineStyle, strokeInPixel } from '@/lib/charting/engine/renderers/draw-line';

type GridMarks = {
    coord: number;
};
export type GridRendererData = {
    vertLinesVisible: boolean;
    vertLinesColor: string;
    vertLineStyle: LineStyle;
    timeMarks: GridMarks[];

    horzLinesVisible: boolean;
    horzLinesColor: string;
    horzLineStyle: LineStyle;
    priceMarks: PriceMark[];
};

export class GridRenderer extends BitmapCoordinatesPaneRenderer {
    private _data: GridRendererData | null = null;

    public setData(data: GridRendererData | null): void {
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

        const lineWidth = Math.max(1, Math.floor(horizontalPixelRatio));
        ctx.lineWidth = lineWidth;

        strokeInPixel(ctx, () => {
            const data = getNotNull(this._data);
            if (data.vertLinesVisible) {
                ctx.strokeStyle = data.vertLinesColor;
                setLineStyle(ctx, data.vertLineStyle);
                ctx.beginPath();
                for (const timeMark of data.timeMarks) {
                    const left = Math.round(timeMark.coord * horizontalPixelRatio);
                    ctx.moveTo(left, -lineWidth);
                    ctx.lineTo(left, bitmapSize.height + lineWidth);
                }
                ctx.stroke();
            }
            if (data.horzLinesVisible) {
                ctx.strokeStyle = data.horzLinesColor;
                setLineStyle(ctx, data.horzLineStyle);
                ctx.beginPath();
                for (const priceMark of data.priceMarks) {
                    const top = Math.round(priceMark.coord * verticalPixelRatio);
                    ctx.moveTo(-lineWidth, top);
                    ctx.lineTo(bitmapSize.width + lineWidth, top);
                }
                ctx.stroke();
            }
        });
    }
}
