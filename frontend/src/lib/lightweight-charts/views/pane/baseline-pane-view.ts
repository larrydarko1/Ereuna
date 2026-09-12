import { type BarPrice } from '@/lib/lightweight-charts/model/bar';
import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import { type ISeries } from '@/lib/lightweight-charts/model/series';
import { type ISeriesBarColorer } from '@/lib/lightweight-charts/model/series-bar-colorer';
import { type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';
import {
    type BaselineFillItem,
    PaneRendererBaselineArea,
} from '@/lib/lightweight-charts/renderers/baseline-renderer-area';
import {
    type BaselineStrokeItem,
    PaneRendererBaselineLine,
} from '@/lib/lightweight-charts/renderers/baseline-renderer-line';
import { CompositeRenderer } from '@/lib/lightweight-charts/renderers/composite-renderer';

import { LinePaneViewBase } from '@/lib/lightweight-charts/views/pane/line-pane-view-base';

export class SeriesBaselinePaneView extends LinePaneViewBase<
    'Baseline',
    BaselineFillItem & BaselineStrokeItem,
    CompositeRenderer
> {
    protected readonly _renderer: CompositeRenderer = new CompositeRenderer();
    private readonly _baselineAreaRenderer: PaneRendererBaselineArea = new PaneRendererBaselineArea();
    private readonly _baselineLineRenderer: PaneRendererBaselineLine = new PaneRendererBaselineLine();

    public constructor(series: ISeries<'Baseline'>, model: IChartModelBase) {
        super(series, model);
        this._renderer.setRenderers([this._baselineAreaRenderer, this._baselineLineRenderer]);
    }

    protected _createRawItem(
        time: TimePointIndex,
        price: BarPrice,
        colorer: ISeriesBarColorer<'Baseline'>,
    ): BaselineFillItem & BaselineStrokeItem {
        return {
            ...this._createRawItemBase(time, price),
            ...colorer.barStyle(time),
        };
    }

    protected _prepareRendererData(): void {
        const firstValue = this._series.firstValue();
        if (firstValue === null) {
            return;
        }

        const options = this._series.options();

        const baseLevelCoordinate = this._series
            .priceScale()
            .priceToCoordinate(options.baseValue.price, firstValue.value);
        const barWidth = this._model.timeScale().barSpacing();

        this._baselineAreaRenderer.setData({
            items: this._items,

            lineWidth: options.lineWidth,
            lineStyle: options.lineStyle,
            lineType: options.lineType,

            baseLevelCoordinate,
            invertFilledArea: false,

            visibleRange: this._itemsVisibleRange,
            barWidth,
        });

        this._baselineLineRenderer.setData({
            items: this._items,

            lineWidth: options.lineWidth,
            lineStyle: options.lineStyle,
            lineType: options.lineVisible ? options.lineType : undefined,
            pointMarkersRadius: options.pointMarkersVisible
                ? (options.pointMarkersRadius ?? options.lineWidth / 2 + 2)
                : undefined,

            baseLevelCoordinate,

            visibleRange: this._itemsVisibleRange,
            barWidth,
        });
    }
}
