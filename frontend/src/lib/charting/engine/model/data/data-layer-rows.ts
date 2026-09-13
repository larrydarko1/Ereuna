/**
 * The parts of the data layer's reconciliation that hold no state.
 *
 * Everything here answers a question about rows or about one time point's data
 * without reading the layer's two maps, which is what makes them safe to call
 * from anywhere in the merge and what keeps `data-layer.ts` down to the merge
 * itself.
 */
import { getDefined } from '@/lib/charting/engine/helpers/assertions';
import { type Mutable } from '@/lib/charting/engine/helpers/mutable';
import { type SeriesDataItemTypeMap } from '@/lib/charting/engine/model/data/data-consumer';
import { type WhitespacePlotRow } from '@/lib/charting/engine/model/data/get-series-plot-row-creator';
import {
    type IHorzScaleBehavior,
    type InternalHorzScaleItem,
    type InternalHorzScaleItemKey,
} from '@/lib/charting/engine/model/time/ihorz-scale-behavior';
import { type Series, type SeriesUpdateInfo } from '@/lib/charting/engine/model/series/series';
import { type SeriesPlotRow } from '@/lib/charting/engine/model/data/series-data';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { type TimePointIndex } from '@/lib/charting/engine/model/time/time-data';

export type TimePointData = {
    index: TimePointIndex;
    timePoint: InternalHorzScaleItem;

    // actually the type of the value should be related to the series' type (generic type)
    // here, in data layer all data for us is "mutable" by default, but to the chart we provide "readonly" data, to avoid modifying it
    mapping: Map<Series<SeriesType>, Mutable<SeriesPlotRow<SeriesType> | WhitespacePlotRow>>;
};

export type SeriesDataItemWithOriginalTime<
    TSeriesType extends SeriesType,
    THorzScaleItem,
> = SeriesDataItemTypeMap<THorzScaleItem>[TSeriesType] & {
    originalTime: THorzScaleItem;
};

type SeriesRowsTimeSpan = {
    firstTime: InternalHorzScaleItemKey;
    lastTime: InternalHorzScaleItemKey;
};

export function createEmptyTimePointData(timePoint: InternalHorzScaleItem): TimePointData {
    return { index: 0 as TimePointIndex, mapping: new Map(), timePoint };
}

export function seriesUpdateInfo<TSeriesType extends SeriesType, THorzScaleItem>(
    seriesRows: SeriesPlotRow<TSeriesType>[] | undefined,
    prevSeriesRows: SeriesPlotRow<TSeriesType>[] | undefined,
    bh: IHorzScaleBehavior<THorzScaleItem>,
): SeriesUpdateInfo | undefined {
    const firstAndLastTime = seriesRowsTimeSpan(seriesRows, bh);
    const prevFirstAndLastTime = seriesRowsTimeSpan(prevSeriesRows, bh);
    if (firstAndLastTime !== undefined && prevFirstAndLastTime !== undefined) {
        return {
            lastBarUpdatedOrNewBarsAddedToTheRight:
                firstAndLastTime.lastTime >= prevFirstAndLastTime.lastTime &&
                firstAndLastTime.firstTime >= prevFirstAndLastTime.firstTime,
        };
    }

    return undefined;
}

export function timeScalePointTime<TSeriesType extends SeriesType, THorzScaleItem>(
    mergedPointData: Map<Series<TSeriesType>, SeriesPlotRow<TSeriesType> | WhitespacePlotRow>,
): THorzScaleItem {
    let result: THorzScaleItem | undefined;
    mergedPointData.forEach((v: SeriesPlotRow<TSeriesType> | WhitespacePlotRow) => {
        if (result === undefined) {
            result = v.originalTime as THorzScaleItem;
        }
    });

    return getDefined(result);
}

export function saveOriginalTime<TSeriesType extends SeriesType, THorzScaleItem>(
    data: SeriesDataItemWithOriginalTime<TSeriesType, THorzScaleItem>,
): void {
    if (data.originalTime === undefined) {
        data.originalTime = data.time;
    }
}

export function assignIndexToPointData(pointData: TimePointData, index: TimePointIndex): void {
    // first, nevertheless update index of point data ("make it valid")
    pointData.index = index;

    // and then we need to sync indexes for all series
    pointData.mapping.forEach((seriesRow: Mutable<SeriesPlotRow<SeriesType> | WhitespacePlotRow>) => {
        seriesRow.index = index;
    });
}

/** The time span a series' rows cover, or `undefined` when it holds none. */
function seriesRowsTimeSpan<TSeriesType extends SeriesType, THorzScaleItem>(
    seriesRows: SeriesPlotRow<TSeriesType>[] | undefined,
    bh: IHorzScaleBehavior<THorzScaleItem>,
): SeriesRowsTimeSpan | undefined {
    if (seriesRows === undefined || seriesRows.length === 0) {
        return undefined;
    }

    const first = seriesRows[0];
    const last = seriesRows[seriesRows.length - 1];
    if (first === undefined || last === undefined) {
        return undefined;
    }

    return {
        firstTime: bh.key(first.time),
        lastTime: bh.key(last.time),
    };
}
