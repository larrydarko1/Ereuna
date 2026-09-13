/**
 * Places a series' markers: which bar each sits on, which side of it, and how
 * far off so that two markers on the same bar do not overlap.
 */
import { ensureNever } from '@/lib/charting/engine/helpers/assertions';
import { isNumber } from '@/lib/charting/engine/helpers/strict-type-checks';
import { type AutoScaleMargins } from '@/lib/charting/engine/model/series/autoscale-info-impl';
import { type BarPrice, type BarPrices } from '@/lib/charting/engine/model/data/bar';
import { type IChartModelBase } from '@/lib/charting/engine/model/chart/chart-model';
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type PriceScale } from '@/lib/charting/engine/model/price/price-scale';
import { type ISeries } from '@/lib/charting/engine/model/series/series';
import {
    type InternalSeriesMarker,
    type SeriesMarkerPosition,
} from '@/lib/charting/engine/model/series/series-markers';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { type TimePointIndex, visibleTimedValues } from '@/lib/charting/engine/model/time/time-data';
import { type ITimeScale } from '@/lib/charting/engine/model/time/time-scale';
import { type IPaneRenderer } from '@/lib/charting/engine/renderers/ipane-renderer';
import {
    type SeriesMarkerRendererData,
    type SeriesMarkerRendererDataItem,
    SeriesMarkersRenderer,
} from '@/lib/charting/engine/renderers/markers/renderer';
import {
    calculateAdjustedMargin,
    calculateShapeHeight,
    shapeMargin as calculateShapeMargin,
} from '@/lib/charting/engine/renderers/markers/utils';
import { type IUpdatablePaneView, type UpdateType } from '@/lib/charting/engine/views/pane/iupdatable-pane-view';

type Constants = (typeof Constants)[keyof typeof Constants];

type Offsets = {
    aboveBar: number;
    belowBar: number;
};

type MarkerPositions = Record<SeriesMarkerPosition, boolean>;

/** What the marker is being placed against: the bar, the scales, the layout. */
type MarkerContext = {
    seriesData: BarPrices | BarPrice;
    offsets: Offsets;
    textHeight: number;
    shapeMargin: number;
    priceScale: PriceScale;
    timeScale: ITimeScale;
    firstValue: number;
};

const Constants = {
    TextMargin: 0.1,
} as const;

export class SeriesMarkersPaneView implements IUpdatablePaneView {
    private readonly _series: ISeries<SeriesType>;
    private readonly _model: IChartModelBase;
    private _data: SeriesMarkerRendererData;

    private _invalidated = true;
    private _dataInvalidated = true;
    private _autoScaleMarginsInvalidated = true;

    private _autoScaleMargins: AutoScaleMargins | null = null;
    private _markersPositions: MarkerPositions | null = null;
    private _renderer: SeriesMarkersRenderer = new SeriesMarkersRenderer();

    public constructor(series: ISeries<SeriesType>, model: IChartModelBase) {
        this._series = series;
        this._model = model;
        this._data = {
            items: [],
            visibleRange: null,
        };
    }

    public update(updateType?: UpdateType): void {
        this._invalidated = true;
        this._autoScaleMarginsInvalidated = true;
        if (updateType === 'data') {
            this._dataInvalidated = true;
            this._markersPositions = null;
        }
    }

    public renderer(_addAnchors?: boolean): IPaneRenderer | null {
        if (!this._series.visible()) {
            return null;
        }

        if (this._invalidated) {
            this._makeValid();
        }

        const layout = this._model.options().layout;
        this._renderer.setParams(layout.fontSize, layout.fontFamily);
        this._renderer.setData(this._data);

        return this._renderer;
    }

    public autoScaleMargins(): AutoScaleMargins | null {
        if (this._autoScaleMarginsInvalidated) {
            if (this._series.indexedMarkers().length > 0) {
                const barSpacing = this._model.timeScale().barSpacing();
                const shapeMargin = calculateShapeMargin(barSpacing);
                const marginValue = calculateShapeHeight(barSpacing) * 1.5 + shapeMargin * 2;
                const positions = this._getMarkerPositions();

                this._autoScaleMargins = {
                    above: calculateAdjustedMargin(marginValue, {
                        hasSide: positions.aboveBar,
                        hasInBar: positions.inBar,
                    }),
                    below: calculateAdjustedMargin(marginValue, {
                        hasSide: positions.belowBar,
                        hasInBar: positions.inBar,
                    }),
                };
            } else {
                this._autoScaleMargins = null;
            }

            this._autoScaleMarginsInvalidated = false;
        }

        return this._autoScaleMargins;
    }

    protected _getMarkerPositions(): MarkerPositions {
        if (this._markersPositions === null) {
            this._markersPositions = this._series.indexedMarkers().reduce(
                (acc: MarkerPositions, marker: InternalSeriesMarker<TimePointIndex>) => {
                    if (!acc[marker.position]) {
                        acc[marker.position] = true;
                    }
                    return acc;
                },
                {
                    inBar: false,
                    aboveBar: false,
                    belowBar: false,
                },
            );
        }
        return this._markersPositions;
    }

    protected _makeValid(): void {
        const priceScale = this._series.priceScale();
        const timeScale = this._model.timeScale();
        const seriesMarkers = this._series.indexedMarkers();
        if (this._dataInvalidated) {
            this._data.items = seriesMarkers.map<SeriesMarkerRendererDataItem>(
                (marker: InternalSeriesMarker<TimePointIndex>) => ({
                    time: marker.time,
                    x: 0 as Coordinate,
                    y: 0 as Coordinate,
                    size: 0,
                    shape: marker.shape,
                    color: marker.color,
                    internalId: marker.internalId,
                    externalId: marker.id,
                    text: undefined,
                }),
            );
            this._dataInvalidated = false;
        }

        const layoutOptions = this._model.options().layout;

        this._data.visibleRange = null;
        const visibleBars = timeScale.visibleStrictRange();
        if (visibleBars === null) {
            return;
        }

        const firstValue = this._series.firstValue();
        if (firstValue === null) {
            return;
        }
        if (this._data.items.length === 0) {
            return;
        }
        let prevTimeIndex = NaN;
        const shapeMargin = calculateShapeMargin(timeScale.barSpacing());
        const offsets: Offsets = {
            aboveBar: shapeMargin,
            belowBar: shapeMargin,
        };
        this._data.visibleRange = visibleTimedValues(this._data.items, visibleBars, { extended: true });
        for (let index = this._data.visibleRange.from; index < this._data.visibleRange.to; index++) {
            const marker = seriesMarkers[index];
            const rendererItem = this._data.items[index];
            if (marker === undefined || rendererItem === undefined) continue;

            if (marker.time !== prevTimeIndex) {
                // new bar, reset stack counter
                offsets.aboveBar = shapeMargin;
                offsets.belowBar = shapeMargin;
                prevTimeIndex = marker.time;
            }

            rendererItem.x = timeScale.indexToCoordinate(marker.time);
            if (marker.text !== undefined && marker.text.length > 0) {
                rendererItem.text = {
                    content: marker.text,
                    x: 0 as Coordinate,
                    y: 0 as Coordinate,
                    width: 0,
                    height: 0,
                };
            }
            const dataAt = this._series.dataAt(marker.time);
            if (dataAt === null) {
                continue;
            }
            placeMarker(rendererItem, marker, {
                seriesData: dataAt,
                offsets,
                textHeight: layoutOptions.fontSize,
                shapeMargin,
                priceScale,
                timeScale,
                firstValue: firstValue.value,
            });
        }
        this._invalidated = false;
    }
}

/**
 * Sizes the marker from the bar spacing and drops it onto its price, which is
 * one job: a marker's height is what decides where it can sit.
 */
function placeMarker(
    rendererItem: SeriesMarkerRendererDataItem,
    marker: InternalSeriesMarker<TimePointIndex>,
    context: MarkerContext,
): void {
    const { seriesData, offsets, textHeight, shapeMargin, priceScale, timeScale, firstValue } = context;

    const inBarPrice = isNumber(seriesData) ? seriesData : seriesData.close;
    const highPrice = isNumber(seriesData) ? seriesData : seriesData.high;
    const lowPrice = isNumber(seriesData) ? seriesData : seriesData.low;
    const sizeMultiplier = isNumber(marker.size) ? Math.max(marker.size, 0) : 1;
    const shapeSize = calculateShapeHeight(timeScale.barSpacing()) * sizeMultiplier;
    const halfSize = shapeSize / 2;
    rendererItem.size = shapeSize;

    switch (marker.position) {
        case 'inBar': {
            rendererItem.y = priceScale.priceToCoordinate(inBarPrice, firstValue);
            if (rendererItem.text !== undefined) {
                rendererItem.text.y = (rendererItem.y +
                    halfSize +
                    shapeMargin +
                    textHeight * (0.5 + Constants.TextMargin)) as Coordinate;
            }
            return;
        }
        case 'aboveBar': {
            rendererItem.y = (priceScale.priceToCoordinate(highPrice, firstValue) -
                halfSize -
                offsets.aboveBar) as Coordinate;
            if (rendererItem.text !== undefined) {
                rendererItem.text.y = (rendererItem.y -
                    halfSize -
                    textHeight * (0.5 + Constants.TextMargin)) as Coordinate;
                offsets.aboveBar += textHeight * (1 + 2 * Constants.TextMargin);
            }
            offsets.aboveBar += shapeSize + shapeMargin;
            return;
        }
        case 'belowBar': {
            rendererItem.y = (priceScale.priceToCoordinate(lowPrice, firstValue) +
                halfSize +
                offsets.belowBar) as Coordinate;
            if (rendererItem.text !== undefined) {
                rendererItem.text.y = (rendererItem.y +
                    halfSize +
                    shapeMargin +
                    textHeight * (0.5 + Constants.TextMargin)) as Coordinate;
                offsets.belowBar += textHeight * (1 + 2 * Constants.TextMargin);
            }
            offsets.belowBar += shapeSize + shapeMargin;
            return;
        }
        default: {
            // Exhaustiveness assertion. It lives in `default` and not after the
            // switch because `allowUnreachableCode: false` rejects the latter
            ensureNever(marker.position);
            return;
        }
    }
}
