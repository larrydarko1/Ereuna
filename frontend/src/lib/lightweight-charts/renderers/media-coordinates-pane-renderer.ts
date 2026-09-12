import { type CanvasRenderingTarget2D, type MediaCoordinatesRenderingScope } from 'fancy-canvas';

import { type HoverState, type IPaneRenderer } from '@/lib/lightweight-charts/renderers/ipane-renderer';

export abstract class MediaCoordinatesPaneRenderer implements IPaneRenderer {
    public draw(target: CanvasRenderingTarget2D, hover: HoverState): void {
        target.useMediaCoordinateSpace((scope: MediaCoordinatesRenderingScope) => this._drawImpl(scope, hover));
    }

    public drawBackground(target: CanvasRenderingTarget2D, hover: HoverState): void {
        target.useMediaCoordinateSpace((scope: MediaCoordinatesRenderingScope) =>
            this._drawBackgroundImpl(scope, hover),
        );
    }

    protected abstract _drawImpl(renderingScope: MediaCoordinatesRenderingScope, hover: HoverState): void;

    // Most renderers paint nothing behind the series; the ones that do override this
    protected _drawBackgroundImpl(_renderingScope: MediaCoordinatesRenderingScope, _hover: HoverState): void {
        // Nothing behind the series by default
    }
}
