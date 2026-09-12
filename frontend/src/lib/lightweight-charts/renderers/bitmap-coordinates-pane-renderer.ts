import { type BitmapCoordinatesRenderingScope, type CanvasRenderingTarget2D } from 'fancy-canvas';

import { type HoverState, type IPaneRenderer } from '@/lib/lightweight-charts/renderers/ipane-renderer';

export abstract class BitmapCoordinatesPaneRenderer implements IPaneRenderer {
    public draw(target: CanvasRenderingTarget2D, hover: HoverState): void {
        target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => this._drawImpl(scope, hover));
    }

    protected abstract _drawImpl(renderingScope: BitmapCoordinatesRenderingScope, hover: HoverState): void;
}
