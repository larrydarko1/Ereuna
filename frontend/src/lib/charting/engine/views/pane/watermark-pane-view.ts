/**
 * The watermark, as drawn on a pane.
 */
import { makeFont } from '@/lib/charting/engine/helpers/make-font';
import { type Watermark } from '@/lib/charting/engine/model/chart/watermark';
import { type IPaneRenderer } from '@/lib/charting/engine/renderers/ipane-renderer';
import { WatermarkRenderer, type WatermarkRendererData } from '@/lib/charting/engine/renderers/watermark-renderer';
import { type IUpdatablePaneView } from '@/lib/charting/engine/views/pane/iupdatable-pane-view';

export class WatermarkPaneView implements IUpdatablePaneView {
    private _source: Watermark;
    private _invalidated = true;

    private readonly _rendererData: WatermarkRendererData = {
        visible: false,
        color: '',
        lines: [],
        vertAlign: 'center',
        horzAlign: 'center',
    };
    private readonly _renderer: WatermarkRenderer = new WatermarkRenderer(this._rendererData);

    public constructor(source: Watermark) {
        this._source = source;
    }

    public update(): void {
        this._invalidated = true;
    }

    public renderer(): IPaneRenderer {
        if (this._invalidated) {
            this._updateImpl();
            this._invalidated = false;
        }

        return this._renderer;
    }

    private _updateImpl(): void {
        const options = this._source.options();
        const data = this._rendererData;
        data.visible = options.visible;

        if (!data.visible) {
            return;
        }

        data.color = options.color;
        data.horzAlign = options.horzAlign;
        data.vertAlign = options.vertAlign;

        data.lines = [
            {
                text: options.text,
                font: makeFont(options.fontSize, options.fontFamily, options.fontStyle),
                lineHeight: options.fontSize * 1.2,
                vertOffset: 0,
                zoom: 0,
            },
        ];
    }
}
