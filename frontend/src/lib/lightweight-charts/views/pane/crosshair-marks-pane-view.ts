/**
 * The dots the crosshair puts on each series it crosses.
 *
 * The per-series marker data is reused between frames rather than reallocated,
 * because this rebuilds on every pointer move.
 */
import { getNotNull } from '@/lib/lightweight-charts/helpers/assertions';
import { type BarPrice } from '@/lib/lightweight-charts/model/bar';
import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import { type Crosshair, CrosshairMode } from '@/lib/lightweight-charts/model/crosshair';
import { type ISeries } from '@/lib/lightweight-charts/model/series';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';
import { type SeriesItemsIndexesRange, type TimePointIndex } from '@/lib/lightweight-charts/model/time-data';
import { CompositeRenderer } from '@/lib/lightweight-charts/renderers/composite-renderer';
import { type IPaneRenderer } from '@/lib/lightweight-charts/renderers/ipane-renderer';
import { type MarksRendererData, PaneRendererMarks } from '@/lib/lightweight-charts/renderers/marks-renderer';
import { type IUpdatablePaneView, type UpdateType } from '@/lib/lightweight-charts/views/pane/iupdatable-pane-view';

const rangeForSinglePoint: SeriesItemsIndexesRange = { from: 0, to: 1 };

export class CrosshairMarksPaneView implements IUpdatablePaneView {
    private readonly _chartModel: IChartModelBase;
    private readonly _crosshair: Crosshair;
    private readonly _compositeRenderer: CompositeRenderer = new CompositeRenderer();
    private _markersRenderers: PaneRendererMarks[] = [];
    private _markersData: MarksRendererData[] = [];
    private _invalidated = true;

    public constructor(chartModel: IChartModelBase, crosshair: Crosshair) {
        this._chartModel = chartModel;
        this._crosshair = crosshair;
        this._compositeRenderer.setRenderers(this._markersRenderers);
    }

    public update(_updateType?: UpdateType): void {
        const serieses = this._chartModel.serieses();
        if (serieses.length !== this._markersRenderers.length) {
            this._markersData = serieses.map(createEmptyMarkerData);
            this._markersRenderers = this._markersData.map((data: MarksRendererData) => {
                const res = new PaneRendererMarks();
                res.setData(data);
                return res;
            });
            this._compositeRenderer.setRenderers(this._markersRenderers);
        }

        this._invalidated = true;
    }

    public renderer(): IPaneRenderer | null {
        if (this._invalidated) {
            this._updateImpl();
            this._invalidated = false;
        }

        return this._compositeRenderer;
    }

    private _updateImpl(): void {
        const forceHidden = this._crosshair.options().mode === CrosshairMode.Hidden;

        const serieses = this._chartModel.serieses();
        const timePointIndex = this._crosshair.appliedIndex();
        const timeScale = this._chartModel.timeScale();

        serieses.forEach((s: ISeries<SeriesType>, index: number) => {
            const data = this._markersData[index];
            if (data === undefined) {
                return;
            }

            const seriesData = s.markerDataAtIndex(timePointIndex);

            if (forceHidden || seriesData === null || !s.visible()) {
                data.visibleRange = null;
                return;
            }

            const marker = data.items[0];
            if (marker === undefined) {
                return;
            }

            const firstValue = getNotNull(s.firstValue());
            data.lineColor = seriesData.backgroundColor;
            data.radius = seriesData.radius;
            data.lineWidth = seriesData.borderWidth;
            marker.price = seriesData.price;
            marker.y = s.priceScale().priceToCoordinate(seriesData.price, firstValue.value);
            data.backColor =
                seriesData.borderColor ??
                this._chartModel.backgroundColorAtYPercentFromTop(marker.y / s.priceScale().height());
            marker.time = timePointIndex;
            marker.x = timeScale.indexToCoordinate(timePointIndex);
            data.visibleRange = rangeForSinglePoint;
        });
    }
}

function createEmptyMarkerData(): MarksRendererData {
    return {
        items: [
            {
                x: 0 as Coordinate,
                y: 0 as Coordinate,
                time: 0 as TimePointIndex,
                price: 0 as BarPrice,
            },
        ],
        lineColor: '',
        backColor: '',
        radius: 0,
        lineWidth: 0,
        visibleRange: null,
    };
}
