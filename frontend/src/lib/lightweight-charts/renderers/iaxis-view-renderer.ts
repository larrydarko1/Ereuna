/**
 * What an axis view's renderer has to provide.
 */
import { type CanvasRenderingTarget2D } from 'fancy-canvas';

import { type HoverState } from '@/lib/lightweight-charts/renderers/ipane-renderer';

export type IAxisRenderer = {
    draw(target: CanvasRenderingTarget2D, hover: HoverState): void;
    drawBackground?(target: CanvasRenderingTarget2D, hover: HoverState): void;
};
