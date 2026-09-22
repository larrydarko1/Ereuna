/**
 * Builds the area series' fill and its line from the series' plot rows.
 */
import { type IChartModelBase } from '@/lib/charting/engine/model/chart/chart-model';
import { type BarPrice } from '@/lib/charting/engine/model/data/bar';
import { type ISeries } from '@/lib/charting/engine/model/series/series';
import { type ISeriesBarColorer } from '@/lib/charting/engine/model/series/series-bar-colorer';
import { type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';
import { type AreaFillItem, PaneRendererArea } from '@/lib/charting/engine/renderers/area-renderer';
import { CompositeRenderer } from '@/lib/charting/engine/renderers/composite-renderer';
import { type LineStrokeItem, PaneRendererLine } from '@/lib/charting/engine/renderers/line-renderer';
import { LinePaneViewBase } from '@/lib/charting/engine/views/pane/line-pane-view-base';

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
                ? (options.pointMarkersRadius ?? options.lineWidth / 2 + 2)
                : undefined,
        });
    }
}
