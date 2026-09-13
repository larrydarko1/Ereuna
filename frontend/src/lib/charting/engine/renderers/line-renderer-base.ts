/**
 * Strokes a line in however many styled sections the data asks for.
 *
 * A section is closed and stroked whenever the colour or width changes, and the
 * next one starts on the same point so the join is continuous.
 */
import { type BitmapCoordinatesRenderingScope } from 'fancy-canvas';
import { type PricedValue } from '@/lib/charting/engine/model/price/price-scale';
import { type SeriesItemsIndexesRange, type TimedValue } from '@/lib/charting/engine/model/time/time-data';
import { BitmapCoordinatesPaneRenderer } from '@/lib/charting/engine/renderers/bitmap-coordinates-pane-renderer';
import {
    type LinePoint,
    type LineStyle,
    type LineType,
    type LineWidth,
    setLineStyle,
} from '@/lib/charting/engine/renderers/draw-line';
import { drawSeriesPointMarkers } from '@/lib/charting/engine/renderers/draw-series-point-markers';
import { walkLine } from '@/lib/charting/engine/renderers/walk-line';

export type LineItemBase = TimedValue & PricedValue & LinePoint;

export type PaneRendererLineDataBase<TItem extends LineItemBase = LineItemBase> = {
    lineType?: LineType | undefined;

    items: TItem[];

    barWidth: number;

    lineWidth: LineWidth;
    lineStyle: LineStyle;

    visibleRange: SeriesItemsIndexesRange | null;

    pointMarkersRadius?: number | undefined;
};

export abstract class PaneRendererLineBase<
    TData extends PaneRendererLineDataBase,
> extends BitmapCoordinatesPaneRenderer {
    protected _data: TData | null = null;

    public setData(data: TData): void {
        this._data = data;
    }

    protected _drawImpl(renderingScope: BitmapCoordinatesRenderingScope): void {
        if (this._data === null) {
            return;
        }

        const { items, visibleRange, barWidth, lineType, lineWidth, lineStyle, pointMarkersRadius } = this._data;

        if (visibleRange === null) {
            return;
        }

        const ctx = renderingScope.context;

        ctx.lineCap = 'butt';
        ctx.lineWidth = lineWidth * renderingScope.verticalPixelRatio;

        setLineStyle(ctx, lineStyle);

        ctx.lineJoin = 'round';

        const styleGetter = this._strokeStyle.bind(this);

        if (lineType !== undefined) {
            walkLine(renderingScope, { items, lineType, visibleRange, barWidth }, styleGetter, finishStyledArea);
        }

        if (pointMarkersRadius !== undefined && pointMarkersRadius > 0) {
            drawSeriesPointMarkers(renderingScope, items, pointMarkersRadius, visibleRange, styleGetter);
        }
    }

    protected abstract _strokeStyle(
        renderingScope: BitmapCoordinatesRenderingScope,
        item: TData['items'][0],
    ): CanvasRenderingContext2D['strokeStyle'];
}

function finishStyledArea(
    scope: BitmapCoordinatesRenderingScope,
    style: CanvasRenderingContext2D['strokeStyle'],
): void {
    const ctx = scope.context;
    ctx.strokeStyle = style;
    ctx.stroke();
}
