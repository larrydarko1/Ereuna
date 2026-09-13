/**
 * Adapts a caller's custom series view to the pane renderer interface.
 */
import { type CanvasRenderingTarget2D } from 'fancy-canvas';

import { undefinedIfNull } from '@/lib/lightweight-charts/helpers/strict-type-checks';

import { type IChartModelBase } from '@/lib/lightweight-charts/model/chart-model';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import {
    type CustomBarItemData,
    type CustomData,
    type CustomSeriesPricePlotValues,
    type CustomSeriesWhitespaceData,
    type ICustomSeriesPaneRenderer,
    type ICustomSeriesPaneView,
    type PriceToCoordinateConverter,
} from '@/lib/lightweight-charts/model/icustom-series';
import { type PriceScale } from '@/lib/lightweight-charts/model/price-scale';
import { type Series } from '@/lib/lightweight-charts/model/series';
import { type SeriesPlotRow } from '@/lib/lightweight-charts/model/series-data';
import { type TimedValue } from '@/lib/lightweight-charts/model/time-data';
import { type ITimeScale } from '@/lib/lightweight-charts/model/time-scale';
import { type HoverState, type IPaneRenderer } from '@/lib/lightweight-charts/renderers/ipane-renderer';

import { SeriesPaneViewBase } from '@/lib/lightweight-charts/views/pane/series-pane-view-base';

type CustomBarItemBase = TimedValue;

type CustomBarItem = {
    barColor: string;
    originalData?: Record<string, unknown>;
} & CustomBarItemBase;

class CustomSeriesPaneRendererWrapper implements IPaneRenderer {
    private _sourceRenderer: ICustomSeriesPaneRenderer;
    private _priceScale: PriceToCoordinateConverter;
    public constructor(sourceRenderer: ICustomSeriesPaneRenderer, priceScale: PriceToCoordinateConverter) {
        this._sourceRenderer = sourceRenderer;
        this._priceScale = priceScale;
    }

    public draw(target: CanvasRenderingTarget2D, hover: HoverState): void {
        this._sourceRenderer.draw(target, this._priceScale, hover.isHovered, hover.hitTestData);
    }
}

export class SeriesCustomPaneView extends SeriesPaneViewBase<'Custom', CustomBarItem, CustomSeriesPaneRendererWrapper> {
    protected readonly _renderer: CustomSeriesPaneRendererWrapper;
    private readonly _paneView: ICustomSeriesPaneView<unknown>;

    public constructor(series: Series<'Custom'>, model: IChartModelBase, paneView: ICustomSeriesPaneView<unknown>) {
        super(series, model, { extendedVisibleRange: false });
        this._paneView = paneView;
        this._renderer = new CustomSeriesPaneRendererWrapper(
            this._paneView.renderer(),
            (price: number): Coordinate | null => {
                const firstValue = series.firstValue();
                if (firstValue === null) {
                    return null;
                }

                return series.priceScale().priceToCoordinate(price, firstValue.value);
            },
        );
    }

    public priceValueBuilder(
        plotRow: CustomData<unknown> | CustomSeriesWhitespaceData<unknown>,
    ): CustomSeriesPricePlotValues {
        return this._paneView.priceValueBuilder(plotRow);
    }

    public isWhitespace(
        data: CustomData<unknown> | CustomSeriesWhitespaceData<unknown>,
    ): data is CustomSeriesWhitespaceData<unknown> {
        return this._paneView.isWhitespace(data);
    }

    protected _fillRawPoints(): void {
        const colorer = this._series.barColorer();
        this._items = this._series
            .bars()
            .rows()
            .map((row: SeriesPlotRow<'Custom'>) => {
                return {
                    time: row.index,
                    x: NaN as Coordinate,
                    ...colorer.barStyle(row.index),
                    originalData: row.data,
                };
            });
    }

    protected override _convertToCoordinates(_priceScale: PriceScale, timeScale: ITimeScale): void {
        timeScale.indexesToCoordinates(this._items, undefinedIfNull(this._itemsVisibleRange));
    }

    protected _prepareRendererData(): void {
        this._paneView.update(
            {
                bars: this._items.map(unwrapItemData) as CustomBarItemData<unknown>[],
                barSpacing: this._model.timeScale().barSpacing(),
                visibleRange: this._itemsVisibleRange,
            },
            this._series.options(),
        );
    }
}

function unwrapItemData(item: CustomBarItem): Record<keyof CustomBarItem, unknown> {
    return {
        x: item.x,
        time: item.time,
        originalData: item.originalData,
        barColor: item.barColor,
    };
}
