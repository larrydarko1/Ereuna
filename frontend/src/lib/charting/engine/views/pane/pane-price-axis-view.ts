/**
 * The price label drawn inside the pane rather than on the axis, which is what
 * the crosshair shows when the axis labels are off.
 */
import { type CanvasRenderingTarget2D } from 'fancy-canvas';

import { type IChartModelBase } from '@/lib/charting/engine/model/chart/chart-model';
import { type IPriceDataSource } from '@/lib/charting/engine/model/price/iprice-data-source';
import { TextWidthCache } from '@/lib/charting/engine/model/text-width-cache';
import { type IPaneRenderer } from '@/lib/charting/engine/renderers/ipane-renderer';
import {
    type IPriceAxisViewRenderer,
    type PriceAxisViewRendererOptions,
} from '@/lib/charting/engine/renderers/iprice-axis-view-renderer';
import { type IPaneView } from '@/lib/charting/engine/views/pane/ipane-view';
import { type IPriceAxisView } from '@/lib/charting/engine/views/price-axis/iprice-axis-view';

class PanePriceAxisViewRenderer implements IPaneRenderer {
    private _priceAxisViewRenderer: IPriceAxisViewRenderer | null = null;
    private _rendererOptions: PriceAxisViewRendererOptions | null = null;
    private _align: 'left' | 'right' = 'right';
    private readonly _textWidthCache: TextWidthCache;

    public constructor(textWidthCache: TextWidthCache) {
        this._textWidthCache = textWidthCache;
    }

    public setParams(
        priceAxisViewRenderer: IPriceAxisViewRenderer,
        rendererOptions: PriceAxisViewRendererOptions,
        align: 'left' | 'right',
    ): void {
        this._priceAxisViewRenderer = priceAxisViewRenderer;
        this._rendererOptions = rendererOptions;
        this._align = align;
    }

    public draw(target: CanvasRenderingTarget2D): void {
        if (this._rendererOptions === null || this._priceAxisViewRenderer === null) {
            return;
        }

        this._priceAxisViewRenderer.draw(target, this._rendererOptions, this._textWidthCache, this._align);
    }
}

export class PanePriceAxisView implements IPaneView {
    private _priceAxisView: IPriceAxisView;
    private readonly _textWidthCache: TextWidthCache;
    private readonly _dataSource: IPriceDataSource;
    private readonly _chartModel: IChartModelBase;
    private readonly _renderer: PanePriceAxisViewRenderer;
    private _fontSize: number;

    public constructor(priceAxisView: IPriceAxisView, dataSource: IPriceDataSource, chartModel: IChartModelBase) {
        this._priceAxisView = priceAxisView;
        this._textWidthCache = new TextWidthCache(50); // when should we clear cache?
        this._dataSource = dataSource;
        this._chartModel = chartModel;
        this._fontSize = -1;
        this._renderer = new PanePriceAxisViewRenderer(this._textWidthCache);
    }

    public renderer(): IPaneRenderer | null {
        const pane = this._chartModel.paneForSource(this._dataSource);
        if (pane === null) {
            return null;
        }

        // this price scale will be used to find label placement only (left, right, none)
        const priceScale = pane.isOverlay(this._dataSource)
            ? pane.defaultVisiblePriceScale()
            : this._dataSource.priceScale();
        if (priceScale === null) {
            return null;
        }

        const position = pane.priceScalePosition(priceScale);
        if (position === 'overlay') {
            return null;
        }

        const options = this._chartModel.priceAxisRendererOptions();
        if (options.fontSize !== this._fontSize) {
            this._fontSize = options.fontSize;
            this._textWidthCache.reset();
        }

        this._renderer.setParams(this._priceAxisView.paneRenderer(), options, position);
        return this._renderer;
    }
}
