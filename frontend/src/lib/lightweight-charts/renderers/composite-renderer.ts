import { type CanvasRenderingTarget2D } from 'fancy-canvas';

import { type HoverState, type IPaneRenderer } from '@/lib/lightweight-charts/renderers/ipane-renderer';

export class CompositeRenderer implements IPaneRenderer {
    private _renderers: readonly IPaneRenderer[] = [];

    public setRenderers(renderers: readonly IPaneRenderer[]): void {
        this._renderers = renderers;
    }

    public draw(target: CanvasRenderingTarget2D, hover: HoverState): void {
        this._renderers.forEach((renderer: IPaneRenderer) => {
            renderer.draw(target, hover);
        });
    }
}
