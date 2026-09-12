import { type CanvasRenderingTarget2D, type MediaCoordinatesRenderingScope } from 'fancy-canvas';

import { type IPaneRenderer } from '@/lib/lightweight-charts/renderers/ipane-renderer';

export abstract class MediaCoordinatesPaneRenderer implements IPaneRenderer {
    public draw(target: CanvasRenderingTarget2D, isHovered: boolean, hitTestData?: unknown): void {
        target.useMediaCoordinateSpace((scope: MediaCoordinatesRenderingScope) =>
            this._drawImpl(scope, isHovered, hitTestData),
        );
    }

    public drawBackground(target: CanvasRenderingTarget2D, isHovered: boolean, hitTestData?: unknown): void {
        target.useMediaCoordinateSpace((scope: MediaCoordinatesRenderingScope) =>
            this._drawBackgroundImpl(scope, isHovered, hitTestData),
        );
    }

    protected abstract _drawImpl(
        renderingScope: MediaCoordinatesRenderingScope,
        isHovered: boolean,
        hitTestData?: unknown,
    ): void;

    protected _drawBackgroundImpl(
        _renderingScope: MediaCoordinatesRenderingScope,
        _isHovered: boolean,
        _hitTestData?: unknown,
    ): void {}
}
