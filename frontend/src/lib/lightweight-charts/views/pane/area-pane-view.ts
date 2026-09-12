import { type BarPrice } from '@/lib/lightweight-charts/model/bar';
import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import { type ISeries } from '@/lib/lightweight-charts/model/series';
import { type ISeriesBarColorer } from '@/lib/lightweight-charts/model/series-bar-colorer';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';
import { type AreaFillItem, PaneRendererArea } from '@/lib/lightweight-charts/renderers/area-renderer';
import { CompositeRenderer } from '@/lib/lightweight-charts/renderers/composite-renderer';
import { type LineStrokeItem, PaneRendererLine } from '@/lib/lightweight-charts/renderers/line-renderer';

import { LinePaneViewBase } from '@/lib/lightweight-charts/views/pane/line-pane-view-base';

export class SeriesAreaPaneView extends LinePaneViewBase<'Area', AreaFillItem & LineStrokeItem, CompositeRenderer> {
    protected readonly _renderer: CompositeRenderer = new CompositeRenderer();
    private readonly _areaRenderer: PaneRendererArea = new PaneRendererArea();
    private readonly _lineRenderer: PaneRendererLine = new PaneRendererLine();

    public constructor(series: ISeries<'Area'>, model: IChartModelBase) {
        super(series, model);
        this._renderer.setRenderers([this._areaRenderer, this._lineRenderer]);
    }

    protected _createRawItem(
        time: TimePointIndex,
        price: BarPrice,
        colorer: ISeriesBarColorer<'Area'>,
    ): AreaFillItem & LineStrokeItem {
        return {
            ...this._createRawItemBase(time, price),
            ...colorer.barStyle(time),
        };
    }

    protected _prepareRendererData(): void {
        const options = this._series.options();

        this._areaRenderer.setData({
            lineType: options.lineType,
            items: this._items,
            lineStyle: options.lineStyle,
            lineWidth: options.lineWidth,
            baseLevelCoordinate: null,
            invertFilledArea: options.invertFilledArea,
            visibleRange: this._itemsVisibleRange,
            barWidth: this._model.timeScale().barSpacing(),
        });

        this._lineRenderer.setData({
            lineType: options.lineVisible ? options.lineType : undefined,
            items: this._items,
            lineStyle: options.lineStyle,
            lineWidth: options.lineWidth,
            visibleRange: this._itemsVisibleRange,
            barWidth: this._model.timeScale().barSpacing(),
            pointMarkersRadius: options.pointMarkersVisible
                ? options.pointMarkersRadius || options.lineWidth / 2 + 2
                : undefined,
        });
    }
}
