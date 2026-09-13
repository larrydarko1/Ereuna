/**
 * Draws a series' markers, and hit-tests them.
 *
 * Only the markers in the visible range are considered, which is why the data
 * carries the range rather than the renderer recomputing it.
 */
import { type BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { ensureNever } from '@/lib/charting/engine/helpers/assertions';
import { makeFont } from '@/lib/charting/engine/helpers/make-font';

import { type HoveredObject } from '@/lib/charting/engine/model/chart/chart-model';
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type SeriesMarkerShape } from '@/lib/charting/engine/model/series/series-markers';
import { TextWidthCache } from '@/lib/charting/engine/model/text-width-cache';
import { type SeriesItemsIndexesRange, type TimedValue } from '@/lib/charting/engine/model/time/time-data';

import { BitmapCoordinatesPaneRenderer } from '@/lib/charting/engine/renderers/bitmap-coordinates-pane-renderer';
import { drawArrowDown, drawArrowUp, hitTestArrow } from '@/lib/charting/engine/renderers/markers/arrow';
import { drawCircle, hitTestCircle } from '@/lib/charting/engine/renderers/markers/circle';
import { drawSquare, hitTestSquare } from '@/lib/charting/engine/renderers/markers/square';
import { drawRoundedSquare, hitTestRoundedSquare } from '@/lib/charting/engine/renderers/markers/rounded-square';
import { drawText, hitTestText } from '@/lib/charting/engine/renderers/markers/text';
import { type BitmapShapeItemCoordinates } from '@/lib/charting/engine/renderers/markers/utils';

type SeriesMarkerText = {
    content: string;
    x: Coordinate;
    y: Coordinate;
    width: number;
    height: number;
};

export type SeriesMarkerRendererDataItem = {
    y: Coordinate;
    size: number;
    shape: SeriesMarkerShape;
    color: string;
    internalId: number;
    externalId?: string | undefined;
    text?: SeriesMarkerText | undefined;
    textColor?: string | undefined;
} & TimedValue;

export type SeriesMarkerRendererData = {
    items: SeriesMarkerRendererDataItem[];
    visibleRange: SeriesItemsIndexesRange | null;
};

export class SeriesMarkersRenderer extends BitmapCoordinatesPaneRenderer {
    private _data: SeriesMarkerRendererData | null = null;
    private _textWidthCache: TextWidthCache = new TextWidthCache();
    private _fontSize = -1;
    private _fontFamily = '';
    private _font = '';

    public setData(data: SeriesMarkerRendererData): void {
        this._data = data;
    }

    public setParams(fontSize: number, fontFamily: string): void {
        if (this._fontSize !== fontSize || this._fontFamily !== fontFamily) {
            this._fontSize = fontSize;
            this._fontFamily = fontFamily;
            this._font = makeFont(fontSize, fontFamily);
            this._textWidthCache.reset();
        }
    }

    public hitTest(x: Coordinate, y: Coordinate): HoveredObject | null {
        if (this._data === null || this._data.visibleRange === null) {
            return null;
        }

        for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
            const item = this._data.items[i];
            if (item !== undefined && hitTestItem(item, x, y)) {
                return {
                    hitTestData: item.internalId,
                    externalId: item.externalId,
                };
            }
        }

        return null;
    }

    protected _drawImpl({
        context: ctx,
        horizontalPixelRatio,
        verticalPixelRatio,
    }: BitmapCoordinatesRenderingScope): void {
        if (this._data === null || this._data.visibleRange === null) {
            return;
        }

        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.font = `bold ${this._font}`;

        for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
            const item = this._data.items[i];
            if (item === undefined) continue;

            if (item.text !== undefined) {
                item.text.width = this._textWidthCache.measureText(ctx, item.text.content);
                item.text.height = this._fontSize;
                // Use item.x directly since textAlign is now 'center'
                item.text.x = item.x;
            }
            drawItem(item, ctx, horizontalPixelRatio, verticalPixelRatio);
        }
    }
}

function bitmapShapeItemCoordinates(
    item: SeriesMarkerRendererDataItem,
    horizontalPixelRatio: number,
    verticalPixelRatio: number,
): BitmapShapeItemCoordinates {
    const tickWidth = Math.max(1, Math.floor(horizontalPixelRatio));
    const correction = (tickWidth % 2) / 2;
    return {
        x: Math.round(item.x * horizontalPixelRatio) + correction,
        y: item.y * verticalPixelRatio,
        pixelRatio: horizontalPixelRatio,
    };
}

function drawItem(
    item: SeriesMarkerRendererDataItem,
    ctx: CanvasRenderingContext2D,
    horizontalPixelRatio: number,
    verticalPixelRatio: number,
): void {
    // Draw shape first with the item color
    ctx.fillStyle = item.color;
    drawShape(item, ctx, bitmapShapeItemCoordinates(item, horizontalPixelRatio, verticalPixelRatio));

    // Then carve out the text from the shape to show the chart background
    if (item.text !== undefined) {
        // Use destination-out to cut out the text from the shape
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 1)'; // Color doesn't matter, just opacity
        ctx.globalAlpha = 1.0;
        // Use item.y (the marker's y position) to center text vertically inside the shape
        drawText(ctx, item.text.content, item.text.x, item.y, horizontalPixelRatio, verticalPixelRatio);
        // Reset composite operation back to normal
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
    }
}

function drawShape(
    item: SeriesMarkerRendererDataItem,
    ctx: CanvasRenderingContext2D,
    coordinates: BitmapShapeItemCoordinates,
): void {
    if (item.size === 0) {
        return;
    }

    switch (item.shape) {
        case 'arrowDown':
            drawArrowDown(ctx, coordinates, item.size);
            return;
        case 'arrowUp':
            drawArrowUp(ctx, coordinates, item.size);
            return;
        case 'circle':
            drawCircle(ctx, coordinates, item.size);
            return;
        case 'square':
            drawSquare(ctx, coordinates, item.size);
            return;
        case 'roundedSquare':
            drawRoundedSquare(ctx, coordinates, item.size);
            return;
        default:
            // Exhaustiveness assertion. It lives in `default` and not after the
            // switch because `allowUnreachableCode: false` rejects the latter
            ensureNever(item.shape);
            return;
    }
}

function hitTestItem(item: SeriesMarkerRendererDataItem, x: Coordinate, y: Coordinate): boolean {
    if (item.text !== undefined && hitTestText(item.text.x, item.text.y, item.text.width, item.text.height, x, y)) {
        return true;
    }

    return hitTestShape(item, x, y);
}

function hitTestShape(item: SeriesMarkerRendererDataItem, x: Coordinate, y: Coordinate): boolean {
    if (item.size === 0) {
        return false;
    }

    switch (item.shape) {
        case 'arrowDown':
            return hitTestArrow(item.x, item.y, item.size, x, y);
        case 'arrowUp':
            return hitTestArrow(item.x, item.y, item.size, x, y);
        case 'circle':
            return hitTestCircle(item.x, item.y, item.size, x, y);
        case 'square':
            return hitTestSquare(item.x, item.y, item.size, x, y);
        case 'roundedSquare':
            return hitTestRoundedSquare(item.x, item.y, item.size, x, y);
    }
}
