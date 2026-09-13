/**
 * The base for the views that draw one horizontal line at a price the series
 * supplies.
 */
import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import { type ISeries } from '@/lib/lightweight-charts/model/series';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';
import { LineStyle } from '@/lib/lightweight-charts/renderers/draw-line';
import {
    HorizontalLineRenderer,
    type HorizontalLineRendererData,
} from '@/lib/lightweight-charts/renderers/horizontal-line-renderer';
import { type IPaneRenderer } from '@/lib/lightweight-charts/renderers/ipane-renderer';

import { type IPaneView } from '@/lib/lightweight-charts/views/pane/ipane-view';

export abstract class SeriesHorizontalLinePaneView implements IPaneView {
    protected readonly _lineRendererData: HorizontalLineRendererData = {
        y: 0 as Coordinate,
        color: 'rgba(0, 0, 0, 0)',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        visible: false,
    };

    protected readonly _series: ISeries<SeriesType>;
    protected readonly _model: IChartModelBase;
    protected readonly _lineRenderer: HorizontalLineRenderer = new HorizontalLineRenderer();
    private _invalidated = true;

    protected constructor(series: ISeries<SeriesType>) {
        this._series = series;
        this._model = series.model();
        this._lineRenderer.setData(this._lineRendererData);
    }

    public update(): void {
        this._invalidated = true;
    }

    public renderer(): IPaneRenderer | null {
        if (!this._series.visible()) {
            return null;
        }

        if (this._invalidated) {
            this._updateImpl();
            this._invalidated = false;
        }
        return this._lineRenderer;
    }

    protected abstract _updateImpl(): void;
}
