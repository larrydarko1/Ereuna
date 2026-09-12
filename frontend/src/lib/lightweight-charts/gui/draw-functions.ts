import { type CanvasRenderingTarget2D } from 'fancy-canvas';

import { type IDataSource } from '@/lib/lightweight-charts/model/idata-source';
import { type Pane } from '@/lib/lightweight-charts/model/pane';
import { type HoverState, type IPaneRenderer } from '@/lib/lightweight-charts/renderers/ipane-renderer';

import { type IPaneViewsGetter } from '@/lib/lightweight-charts/gui/ipane-view-getter';

export type DrawFunction = (renderer: IPaneRenderer, target: CanvasRenderingTarget2D, hover: HoverState) => void;

export function drawBackground(renderer: IPaneRenderer, target: CanvasRenderingTarget2D, hover: HoverState): void {
    renderer.drawBackground?.(target, hover);
}

export function drawForeground(renderer: IPaneRenderer, target: CanvasRenderingTarget2D, hover: HoverState): void {
    renderer.draw(target, hover);
}

type DrawRendererFn = (renderer: IPaneRenderer) => void;

export function drawSourcePaneViews(
    paneViewsGetter: IPaneViewsGetter,
    drawRendererFn: DrawRendererFn,
    source: IDataSource,
    pane: Pane,
): void {
    const paneViews = paneViewsGetter(source, pane);

    for (const paneView of paneViews) {
        const renderer = paneView.renderer();
        if (renderer !== null) {
            drawRendererFn(renderer);
        }
    }
}
