/**
 * The base for renderers that work in device pixels.
 *
 * Anything that has to land exactly on a pixel boundary — a one-pixel line, a bar
 * edge — draws here rather than in media coordinates, where the device pixel ratio
 * would put it between two pixels and the browser would blur it.
 */
import { type BitmapCoordinatesRenderingScope, type CanvasRenderingTarget2D } from 'fancy-canvas';

import { type HoverState, type IPaneRenderer } from '@/lib/charting/engine/renderers/ipane-renderer';

export abstract class BitmapCoordinatesPaneRenderer implements IPaneRenderer {
    public draw(target: CanvasRenderingTarget2D, hover: HoverState): void {
        target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => this._drawImpl(scope, hover));
    }

    protected abstract _drawImpl(renderingScope: BitmapCoordinatesRenderingScope, hover: HoverState): void;
}
