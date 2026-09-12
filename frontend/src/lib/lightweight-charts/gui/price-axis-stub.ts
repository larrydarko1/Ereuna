import {
    type BitmapCoordinatesRenderingScope,
    type CanvasElementBitmapSizeBinding,
    equalSizes,
    type Size,
    size,
    tryCreateCanvasRenderingTarget2D,
} from 'fancy-canvas';

import { clearRect } from '@/lib/lightweight-charts/helpers/canvas-helpers';
import { type IDestroyable } from '@/lib/lightweight-charts/helpers/idestroyable';

import { type ChartOptionsBase } from '@/lib/lightweight-charts/model/chart-model';
import { InvalidationLevel } from '@/lib/lightweight-charts/model/invalidate-mask';
import { type PriceAxisRendererOptionsProvider } from '@/lib/lightweight-charts/renderers/price-axis-renderer-options-provider';

import { createBoundCanvas, releaseCanvas } from '@/lib/lightweight-charts/gui/canvas-utils';
import { type PriceAxisWidgetSide } from '@/lib/lightweight-charts/gui/price-axis-widget';

export type PriceAxisStubParams = {
    rendererOptionsProvider: PriceAxisRendererOptionsProvider;
};

export type BorderVisibleGetter = () => boolean;
export type ColorGetter = () => string;

export class PriceAxisStub implements IDestroyable {
    private readonly _cell: HTMLDivElement;
    private readonly _canvasBinding: CanvasElementBitmapSizeBinding;

    private readonly _rendererOptionsProvider: PriceAxisRendererOptionsProvider;

    private _options: ChartOptionsBase;

    private _invalidated = true;

    private readonly _isLeft: boolean;
    private _size: Size = size({ width: 0, height: 0 });
    private readonly _borderVisible: BorderVisibleGetter;
    private readonly _bottomColor: ColorGetter;

    public constructor(
        side: PriceAxisWidgetSide,
        options: ChartOptionsBase,
        params: PriceAxisStubParams,
        borderVisible: BorderVisibleGetter,
        bottomColor: ColorGetter,
    ) {
        this._isLeft = side === 'left';
        this._rendererOptionsProvider = params.rendererOptionsProvider;

        this._options = options;
        this._borderVisible = borderVisible;
        this._bottomColor = bottomColor;

        this._cell = document.createElement('div');
        this._cell.style.width = '25px';
        this._cell.style.height = '100%';
        this._cell.style.overflow = 'hidden';

        this._canvasBinding = createBoundCanvas(this._cell, size({ width: 16, height: 16 }));
        this._canvasBinding.subscribeSuggestedBitmapSizeChanged(this._canvasSuggestedBitmapSizeChangedHandler);
    }

    public destroy(): void {
        this._canvasBinding.unsubscribeSuggestedBitmapSizeChanged(this._canvasSuggestedBitmapSizeChangedHandler);
        releaseCanvas(this._canvasBinding.canvasElement);
        this._canvasBinding.dispose();
    }

    public getElement(): HTMLElement {
        return this._cell;
    }

    public getSize(): Size {
        return this._size;
    }

    public setSize(newSize: Size): void {
        if (!equalSizes(this._size, newSize)) {
            this._size = newSize;

            this._canvasBinding.resizeCanvasElement(newSize);

            this._cell.style.width = `${newSize.width}px`;
            this._cell.style.height = `${newSize.height}px`;

            this._invalidated = true;
        }
    }

    public paint(type: InvalidationLevel): void {
        if (type < InvalidationLevel.Full && !this._invalidated) {
            return;
        }

        if (this._size.width === 0 || this._size.height === 0) {
            return;
        }

        this._invalidated = false;

        this._canvasBinding.applySuggestedBitmapSize();
        const target = tryCreateCanvasRenderingTarget2D(this._canvasBinding);
        if (target !== null) {
            target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
                this._drawBackground(scope);
                this._drawBorder(scope);
            });
        }
    }

    public getBitmapSize(): Size {
        return this._canvasBinding.bitmapSize;
    }

    public drawBitmap(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        const bitmapSize = this.getBitmapSize();
        if (bitmapSize.width > 0 && bitmapSize.height > 0) {
            ctx.drawImage(this._canvasBinding.canvasElement, x, y);
        }
    }

    private _drawBorder({
        context: ctx,
        bitmapSize,
        horizontalPixelRatio,
        verticalPixelRatio,
    }: BitmapCoordinatesRenderingScope): void {
        if (!this._borderVisible()) {
            return;
        }

        ctx.fillStyle = this._options.timeScale.borderColor;

        const horzBorderSize = Math.floor(this._rendererOptionsProvider.options().borderSize * horizontalPixelRatio);
        const vertBorderSize = Math.floor(this._rendererOptionsProvider.options().borderSize * verticalPixelRatio);
        const left = this._isLeft ? bitmapSize.width - horzBorderSize : 0;

        ctx.fillRect(left, 0, horzBorderSize, vertBorderSize);
    }

    private _drawBackground({ context: ctx, bitmapSize }: BitmapCoordinatesRenderingScope): void {
        clearRect(ctx, 0, 0, bitmapSize.width, bitmapSize.height, this._bottomColor());
    }

    private readonly _canvasSuggestedBitmapSizeChangedHandler = (): void => this.paint(InvalidationLevel.Full);
}
