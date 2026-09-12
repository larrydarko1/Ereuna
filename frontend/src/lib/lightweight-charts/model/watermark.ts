import { type HorzAlign, type VertAlign } from '@/lib/lightweight-charts/renderers/watermark-renderer';
import { type IPaneView } from '@/lib/lightweight-charts/views/pane/ipane-view';
import { WatermarkPaneView } from '@/lib/lightweight-charts/views/pane/watermark-pane-view';
import { type IPriceAxisView } from '@/lib/lightweight-charts/views/price-axis/iprice-axis-view';

import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import { DataSource } from '@/lib/lightweight-charts/model/data-source';

/** Watermark options. */
export type WatermarkOptions = {
    /**
     * Watermark color.
     *
     * @defaultValue `'rgba(0, 0, 0, 0)'`
     */
    color: string;

    /**
     * Display the watermark.
     *
     * @defaultValue `false`
     */
    visible: boolean;

    /**
     * Text of the watermark. Word wrapping is not supported.
     *
     * @defaultValue `''`
     */
    text: string;

    /**
     * Font size in pixels.
     *
     * @defaultValue `48`
     */
    fontSize: number;

    /**
     * Font family.
     *
     * @defaultValue `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`
     */
    fontFamily: string;

    /**
     * Font style.
     *
     * @defaultValue `''`
     */
    fontStyle: string;

    /**
     * Horizontal alignment inside the chart area.
     *
     * @defaultValue `'center'`
     */
    horzAlign: HorzAlign;

    /**
     * Vertical alignment inside the chart area.
     *
     * @defaultValue `'center'`
     */
    vertAlign: VertAlign;
};

export class Watermark extends DataSource {
    private readonly _paneView: WatermarkPaneView;
    private readonly _options: WatermarkOptions;

    public constructor(_model: IChartModelBase, options: WatermarkOptions) {
        super();
        this._options = options;
        this._paneView = new WatermarkPaneView(this);
    }

    public override priceAxisViews(): readonly IPriceAxisView[] {
        return [];
    }

    public paneViews(): readonly IPaneView[] {
        return [this._paneView];
    }

    public options(): Readonly<WatermarkOptions> {
        return this._options;
    }

    public updateAllViews(): void {
        this._paneView.update();
    }
}
