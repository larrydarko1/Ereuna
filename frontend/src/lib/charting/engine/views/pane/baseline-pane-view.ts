/**
 * The baseline series' view: the two fills and the line, all keyed to where
 * the base value sits in the visible price range.
 */
import { type BarPrice } from '@/lib/charting/engine/model/data/bar';
import { type IChartModelBase } from '@/lib/charting/engine/model/chart/chart-model';
import { type ISeries } from '@/lib/charting/engine/model/series/series';
import { type ISeriesBarColorer } from '@/lib/charting/engine/model/series/series-bar-colorer';
import { type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';
import {
    type BaselineFillItem,
    PaneRendererBaselineArea,
} from '@/lib/charting/engine/renderers/baseline-renderer-area';
import {
    type BaselineStrokeItem,
    PaneRendererBaselineLine,
} from '@/lib/charting/engine/renderers/baseline-renderer-line';
import { CompositeRenderer } from '@/lib/charting/engine/renderers/composite-renderer';

import { LinePaneViewBase } from '@/lib/charting/engine/views/pane/line-pane-view-base';

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
