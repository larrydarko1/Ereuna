import { type CanvasRenderingTarget2D } from 'fancy-canvas';

export type IAxisRenderer = {
    draw(target: CanvasRenderingTarget2D, isHovered: boolean, hitTestData?: unknown): void;
    drawBackground?(target: CanvasRenderingTarget2D, isHovered: boolean, hitTestData?: unknown): void;
}
