/**
 * The two passes every pane draws in — backgrounds first, then foregrounds —
 * applied across a source's pane views.
 *
 * Keeping the order here rather than in each renderer is what stops one source's
 * background from painting over another's content.
 */
import { type CanvasRenderingTarget2D } from 'fancy-canvas';
import { type IDataSource } from '@/lib/charting/engine/model/chart/idata-source';
import { type Pane } from '@/lib/charting/engine/model/chart/pane';
import { type HoverState, type IPaneRenderer } from '@/lib/charting/engine/renderers/ipane-renderer';
import { type IPaneViewsGetter } from '@/lib/charting/engine/gui/ipane-view-getter';

export type DrawFunction = (renderer: IPaneRenderer, target: CanvasRenderingTarget2D, hover: HoverState) => void;

type DrawRendererFn = (renderer: IPaneRenderer) => void;

export function drawBackground(renderer: IPaneRenderer, target: CanvasRenderingTarget2D, hover: HoverState): void {
    renderer.drawBackground?.(target, hover);
}

export function drawForeground(renderer: IPaneRenderer, target: CanvasRenderingTarget2D, hover: HoverState): void {
    renderer.draw(target, hover);
}

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
