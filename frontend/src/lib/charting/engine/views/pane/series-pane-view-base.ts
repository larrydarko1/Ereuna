/**
 * The base for every series view: holds the series and the model, and
 * rebuilds its items only when what it depends on actually changed.
 */
import { type IChartModelBase } from '@/lib/charting/engine/model/chart/chart-model';
import { type PriceScale } from '@/lib/charting/engine/model/price/price-scale';
import { type ISeries } from '@/lib/charting/engine/model/series/series';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import {
    type SeriesItemsIndexesRange,
    type TimedValue,
    visibleTimedValues,
} from '@/lib/charting/engine/model/time/time-data';
import { type ITimeScale } from '@/lib/charting/engine/model/time/time-scale';
import { type IPaneRenderer } from '@/lib/charting/engine/renderers/ipane-renderer';

import { type IUpdatablePaneView, type UpdateType } from '@/lib/charting/engine/views/pane/iupdatable-pane-view';

export type SeriesPaneViewOptions = {
    // Whether the visible range is widened by one item at each end, so that a
    // line drawn to an off-screen neighbour still enters from the right place
    extendedVisibleRange: boolean;
};

export abstract class SeriesPaneViewBase<
    TSeriesType extends SeriesType,
    TItemType extends TimedValue,
    TRenderer extends IPaneRenderer,
> implements IUpdatablePaneView {
    protected readonly _series: ISeries<TSeriesType>;
    protected readonly _model: IChartModelBase;
    protected _invalidated = true;
    protected _dataInvalidated = true;
    protected _optionsInvalidated = true;
    protected _items: TItemType[] = [];
    protected _itemsVisibleRange: SeriesItemsIndexesRange | null = null;
    protected abstract readonly _renderer: TRenderer;
    private readonly _extendedVisibleRange: boolean;

    public constructor(series: ISeries<TSeriesType>, model: IChartModelBase, options: SeriesPaneViewOptions) {
        this._series = series;
        this._model = model;
        this._extendedVisibleRange = options.extendedVisibleRange;
    }

    public update(updateType?: UpdateType): void {
        this._invalidated = true;
        if (updateType === 'data') {
            this._dataInvalidated = true;
        }
        if (updateType === 'options') {
            this._optionsInvalidated = true;
        }
    }

    public renderer(): IPaneRenderer | null {
        if (!this._series.visible()) {
            return null;
        }

        this._makeValid();

        return this._itemsVisibleRange === null ? null : this._renderer;
    }

    protected abstract _fillRawPoints(): void;

    protected _updateOptions(): void {
        this._items = this._items.map((item: TItemType) => ({
            ...item,
            ...this._series.barColorer().barStyle(item.time),
        }));
    }

    protected abstract _convertToCoordinates(priceScale: PriceScale, timeScale: ITimeScale, firstValue: number): void;

    protected _clearVisibleRange(): void {
        this._itemsVisibleRange = null;
    }

    protected abstract _prepareRendererData(): void;

    private _makeValid(): void {
        if (this._dataInvalidated) {
            this._fillRawPoints();
            this._dataInvalidated = false;
        }

        if (this._optionsInvalidated) {
            this._updateOptions();
            this._optionsInvalidated = false;
        }

        if (this._invalidated) {
            this._makeValidImpl();
            this._invalidated = false;
        }
    }

    private _makeValidImpl(): void {
        const priceScale = this._series.priceScale();
        const timeScale = this._model.timeScale();

        this._clearVisibleRange();

        if (timeScale.isEmpty() || priceScale.isEmpty()) {
            return;
        }

        const visibleBars = timeScale.visibleStrictRange();
        if (visibleBars === null) {
            return;
        }

        if (this._series.bars().size() === 0) {
            return;
        }

        const firstValue = this._series.firstValue();
        if (firstValue === null) {
            return;
        }

        this._itemsVisibleRange = visibleTimedValues(this._items, visibleBars, {
            extended: this._extendedVisibleRange,
        });
        this._convertToCoordinates(priceScale, timeScale, firstValue.value);

        this._prepareRendererData();
    }
}
