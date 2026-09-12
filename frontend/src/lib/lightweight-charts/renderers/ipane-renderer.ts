import { type CanvasRenderingTarget2D } from 'fancy-canvas';

import { type HoveredObject } from '@/lib/lightweight-charts/model/chart-model';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';

export interface IPaneRenderer {
    draw(target: CanvasRenderingTarget2D, isHovered: boolean, hitTestData?: unknown): void;
    drawBackground?(target: CanvasRenderingTarget2D, isHovered: boolean, hitTestData?: unknown): void;
    hitTest?(x: Coordinate, y: Coordinate): HoveredObject | null;
}
