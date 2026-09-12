import { type CanvasRenderingTarget2D } from 'fancy-canvas';

import { type TextWidthCache } from '@/lib/lightweight-charts/model/text-width-cache';

import { type LineWidth } from '@/lib/lightweight-charts/renderers/draw-line';

export type PriceAxisViewRendererCommonData = {
    activeBackground?: string;
    background: string;
    coordinate: number;
    fixedCoordinate?: number | undefined;
    additionalPaddingTop: number;
    additionalPaddingBottom: number;
};

export type PriceAxisViewRendererData = {
    visible: boolean;
    text: string;
    tickVisible: boolean;
    moveTextToInvisibleTick: boolean;
    borderColor: string;
    color: string;
    lineWidth?: LineWidth;
    borderVisible: boolean;
    separatorVisible: boolean;
};

export type PriceAxisViewRendererOptions = {
    baselineOffset: number;
    borderSize: number;
    font: string;
    fontFamily: string;
    color: string;
    paneBackgroundColor: string;
    fontSize: number;
    paddingBottom: number;
    paddingInner: number;
    paddingOuter: number;
    paddingTop: number;
    tickLength: number;
};

export type IPriceAxisViewRenderer = {
    draw(
        target: CanvasRenderingTarget2D,
        rendererOptions: PriceAxisViewRendererOptions,
        textWidthCache: TextWidthCache,
        align: 'left' | 'right',
    ): void;

    height(rendererOptions: PriceAxisViewRendererOptions): number;
    setData(data: PriceAxisViewRendererData, commonData: PriceAxisViewRendererCommonData): void;
};

export type IPriceAxisViewRendererConstructor = new (
    data: PriceAxisViewRendererData,
    commonData: PriceAxisViewRendererCommonData,
) => IPriceAxisViewRenderer;
