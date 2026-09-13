/**
 * What a pane renderer has to provide: a draw, an optional background pass,
 * and a hit test.
 */
import { type CanvasRenderingTarget2D } from 'fancy-canvas';

import { type HoveredObject } from '@/lib/lightweight-charts/model/chart-model';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';

/**
 * What the pointer is doing over a renderer, as every draw call takes it.
 *
 * The two travel together — `hitTestData` identifies the object under the
 * pointer, and only means anything while something is hovered — so they are one
 * named argument rather than a bare boolean followed by a payload.
 */
export type HoverState = {
    isHovered: boolean;
    hitTestData?: unknown;
};

export type IPaneRenderer = {
    draw(target: CanvasRenderingTarget2D, hover: HoverState): void;
    drawBackground?(target: CanvasRenderingTarget2D, hover: HoverState): void;
    hitTest?(x: Coordinate, y: Coordinate): HoveredObject | null;
};
