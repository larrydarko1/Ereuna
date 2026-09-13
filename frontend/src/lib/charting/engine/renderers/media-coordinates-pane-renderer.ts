/**
 * The base for renderers that work in CSS pixels and let the canvas scale
 * handle the device pixel ratio.
 *
 * Anything whose exact pixel alignment does not matter draws here; anything whose
 * does uses the bitmap base instead.
 */
import { type CanvasRenderingTarget2D, type MediaCoordinatesRenderingScope } from 'fancy-canvas';

import { type HoverState, type IPaneRenderer } from '@/lib/charting/engine/renderers/ipane-renderer';

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
