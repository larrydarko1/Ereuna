import { type CanvasRenderingTarget2D } from 'fancy-canvas';

import { type TextWidthCache } from '@/lib/lightweight-charts/model/text-width-cache';

export interface TimeAxisViewRendererOptions {
    baselineOffset: number;
    borderSize: number;
    font: string;
    fontSize: number;
    paddingBottom: number;
    paddingTop: number;
    tickLength: number;
    paddingHorizontal: number;
    widthCache: TextWidthCache;
    labelBottomOffset: number;
}

export interface ITimeAxisViewRenderer {
    draw(target: CanvasRenderingTarget2D, rendererOptions: TimeAxisViewRendererOptions): void;
}
