/**
 * Reconciles one series' new data with every other series on the chart.
 *
 * Series share a horizontal scale, so appending a bar to one can shift the indices
 * of all of them. Everything goes through here for that reason, and the response
 * says exactly what changed — which series, and whether the time scale moved —
 * so the model can invalidate no more than it has to.
 */
import { lowerBound } from '@/lib/charting/engine/helpers/algorithms';
import { getDefined } from '@/lib/charting/engine/helpers/assertions';
import { type Mutable } from '@/lib/charting/engine/helpers/mutable';
import { type SeriesDataItemTypeMap } from '@/lib/charting/engine/model/data/data-consumer';
import {
    getSeriesPlotRowCreator,
    isSeriesPlotRow,
    type WhitespacePlotRow,
} from '@/lib/charting/engine/model/data/get-series-plot-row-creator';
import {
    type IHorzScaleBehavior,
    type InternalHorzScaleItem,
    type InternalHorzScaleItemKey,
} from '@/lib/charting/engine/model/time/ihorz-scale-behavior';
import {
    assignIndexToPointData,
    createEmptyTimePointData,
    saveOriginalTime,
    type SeriesDataItemWithOriginalTime,
    seriesUpdateInfo,
    type TimePointData,
    timeScalePointTime,
} from '@/lib/charting/engine/model/data/data-layer-rows';
import { type Series, type SeriesUpdateInfo } from '@/lib/charting/engine/model/series/series';
import { type SeriesPlotRow } from '@/lib/charting/engine/model/data/series-data';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import {
    type TickMarkWeightValue,
    type TimePointIndex,
    type TimeScalePoint,
} from '@/lib/charting/engine/model/time/time-data';

export type TimedData<THorzScaleItem> = Pick<SeriesDataItemTypeMap<THorzScaleItem>[SeriesType], 'time'>;

export type TimeScaleChanges = {
    /**
     * An index of the first changed time scale point by any type of change (time, weight, etc)
     */
    firstChangedPointIndex?: TimePointIndex;

    /**
     * An array of the new time scale points
     */
    points?: readonly TimeScalePoint[];

    /**
     * In terms of time scale "base index" means the latest time scale point with data (there might be whitespaces)
     */
    baseIndex: TimePointIndex | null;
};

export type SeriesChanges = {
    /**
     * Data to be merged into series' plot list
     */
    data: readonly SeriesPlotRow<SeriesType>[];
    /**
     * Additional info about this change
     */
    info?: SeriesUpdateInfo | undefined;
};

export type DataUpdateResponse = {
    /**
     * Contains updates for all _changed_ series (if series data doesn't changed then it will not be here)
     */
    series: Map<Series<SeriesType>, SeriesChanges>;

    /**
     * Contains optional time scale points
     */
    timeScale: TimeScaleChanges;
};

export type InternalTimeScalePoint = {
    pointData: TimePointData;
} & Mutable<TimeScalePoint>;

export class DataLayer<THorzScaleItem> {
    // note that _pointDataByTimePoint and _seriesRowsBySeries shares THE SAME objects in their values between each other
    // it's just different kind of maps to make usages/perf better
    private _pointDataByTimePoint = new Map<InternalHorzScaleItemKey, TimePointData>();
    private _seriesRowsBySeries = new Map<Series<SeriesType>, SeriesPlotRow<SeriesType>[]>();
    private _seriesLastTimePoint = new Map<Series<SeriesType>, InternalHorzScaleItem>();

    // this is kind of "dest" values (in opposite to "source" ones) - we don't need to modify it manually, the only by calling _updateTimeScalePoints or updateSeriesData methods
    private _sortedTimePoints: readonly InternalTimeScalePoint[] = [];

    private readonly _horzScaleBehavior: IHorzScaleBehavior<THorzScaleItem>;

    public constructor(horzScaleBehavior: IHorzScaleBehavior<THorzScaleItem>) {
        this._horzScaleBehavior = horzScaleBehavior;
    }

    public destroy(): void {
        this._pointDataByTimePoint.clear();
        this._seriesRowsBySeries.clear();
        this._seriesLastTimePoint.clear();
        this._sortedTimePoints = [];
    }

    public setSeriesData<TSeriesType extends SeriesType>(
        series: Series<TSeriesType>,
        data: SeriesDataItemTypeMap<THorzScaleItem>[TSeriesType][],
    ): DataUpdateResponse {
        let needCleanupPoints = this._pointDataByTimePoint.size !== 0;

        let isTimeScaleAffected = false;

        // save previous series rows data before it's replaced inside this._setRowsToSeries
        const prevSeriesRows = this._seriesRowsBySeries.get(series);
        if (prevSeriesRows !== undefined) {
            if (this._seriesRowsBySeries.size === 1) {
                needCleanupPoints = false;
                isTimeScaleAffected = true;

                // perf optimization - if there is only 1 series, then we can just clear and fill everything from scratch
                this._pointDataByTimePoint.clear();
            } else {
                // perf optimization - actually we have to use this._pointDataByTimePoint for going through here
                // but as soon as this._sortedTimePoints is just a different form of _pointDataByTimePoint we can use it as well
                for (const point of this._sortedTimePoints) {
                    isTimeScaleAffected = point.pointData.mapping.delete(series) || isTimeScaleAffected;
                }
            }
        }

        let seriesRows: (SeriesPlotRow<TSeriesType> | WhitespacePlotRow)[] = [];

        if (data.length !== 0) {
            const originalTimes = data.map((d: SeriesDataItemTypeMap<THorzScaleItem>[TSeriesType]) => d.time);

            const timeConverter = this._horzScaleBehavior.createConverterToInternalObj(data);

            const createPlotRow = getSeriesPlotRowCreator<TSeriesType, THorzScaleItem>(series.seriesType());
            const dataToPlotRow = series.customSeriesPlotValuesBuilder();
            const customWhitespaceChecker = series.customSeriesWhitespaceCheck<THorzScaleItem>();

            seriesRows = data.map((item: SeriesDataItemTypeMap<THorzScaleItem>[TSeriesType], index: number) => {
                const time = timeConverter(item.time);

                const horzItemKey = this._horzScaleBehavior.key(time);

                let timePointData = this._pointDataByTimePoint.get(horzItemKey);
                if (timePointData === undefined) {
                    // the indexes will be sync later
                    timePointData = createEmptyTimePointData(time);
                    this._pointDataByTimePoint.set(horzItemKey, timePointData);
                    isTimeScaleAffected = true;
                }

                const row = createPlotRow(time, timePointData.index, item, getDefined(originalTimes[index]), {
                    dataToPlotRow,
                    customIsWhitespace: customWhitespaceChecker,
                });
                timePointData.mapping.set(series, row);
                return row;
            });
        }

        if (needCleanupPoints) {
            // we deleted the old data from mapping and added the new ones
            // so there might be empty points now, let's remove them first
            this._cleanupPointsData();
        }

        this._setRowsToSeries(series, seriesRows);

        let firstChangedPointIndex = -1;
        if (isTimeScaleAffected) {
            // then generate the time scale points
            // timeWeight will be updates in _updateTimeScalePoints later
            const newTimeScalePoints: InternalTimeScalePoint[] = [];
            this._pointDataByTimePoint.forEach((pointData: TimePointData) => {
                newTimeScalePoints.push({
                    timeWeight: 0 as TickMarkWeightValue,
                    time: pointData.timePoint,
                    pointData,
                    originalTime: timeScalePointTime(pointData.mapping),
                });
            });

            newTimeScalePoints.sort(
                (t1: InternalTimeScalePoint, t2: InternalTimeScalePoint) =>
                    this._horzScaleBehavior.key(t1.time) - this._horzScaleBehavior.key(t2.time),
            );

            firstChangedPointIndex = this._replaceTimeScalePoints(newTimeScalePoints);
        }

        return this._getUpdateResponse(
            series,
            firstChangedPointIndex,
            seriesUpdateInfo(this._seriesRowsBySeries.get(series), prevSeriesRows, this._horzScaleBehavior),
        );
    }

    public removeSeries(series: Series<SeriesType>): DataUpdateResponse {
        return this.setSeriesData(series, []);
    }

    public updateSeriesData<TSeriesType extends SeriesType>(
        series: Series<TSeriesType>,
        data: SeriesDataItemTypeMap<THorzScaleItem>[TSeriesType],
    ): DataUpdateResponse {
        const extendedData = data as SeriesDataItemWithOriginalTime<TSeriesType, THorzScaleItem>;
        saveOriginalTime(extendedData);
        // convertStringToBusinessDay(data);
        this._horzScaleBehavior.preprocessData(data);
        const timeConverter = this._horzScaleBehavior.createConverterToInternalObj([data]);

        const time = timeConverter(data.time);

        const lastSeriesTime = this._seriesLastTimePoint.get(series);
        if (
            lastSeriesTime !== undefined &&
            this._horzScaleBehavior.key(time) < this._horzScaleBehavior.key(lastSeriesTime)
        ) {
            throw new Error(
                `Cannot update oldest data, last time=${this._horzScaleBehavior.key(lastSeriesTime)}, ` +
                    `new time=${this._horzScaleBehavior.key(time)}`,
            );
        }

        let pointDataAtTime = this._pointDataByTimePoint.get(this._horzScaleBehavior.key(time));

        // if no point data found for the new data item
        // that means that we need to update scale
        const affectsTimeScale = pointDataAtTime === undefined;

        if (pointDataAtTime === undefined) {
            // the indexes will be sync later
            pointDataAtTime = createEmptyTimePointData(time);
            this._pointDataByTimePoint.set(this._horzScaleBehavior.key(time), pointDataAtTime);
        }

        const createPlotRow = getSeriesPlotRowCreator<SeriesType, THorzScaleItem>(series.seriesType());
        const dataToPlotRow = series.customSeriesPlotValuesBuilder();
        const customWhitespaceChecker = series.customSeriesWhitespaceCheck<THorzScaleItem>();
        const plotRow = createPlotRow(time, pointDataAtTime.index, data, extendedData.originalTime, {
            dataToPlotRow,
            customIsWhitespace: customWhitespaceChecker,
        });

        pointDataAtTime.mapping.set(series, plotRow);

        this._updateLastSeriesRow(series, plotRow);

        const info: SeriesUpdateInfo = { lastBarUpdatedOrNewBarsAddedToTheRight: isSeriesPlotRow(plotRow) };

        // if point already exist on the time scale - we don't need to make a full update and just make an incremental one
        if (!affectsTimeScale) {
            return this._getUpdateResponse(series, -1, info);
        }

        const newPoint: InternalTimeScalePoint = {
            timeWeight: 0 as TickMarkWeightValue,
            time: pointDataAtTime.timePoint,
            pointData: pointDataAtTime,
            originalTime: timeScalePointTime(pointDataAtTime.mapping),
        };

        const insertIndex = lowerBound(
            this._sortedTimePoints,
            this._horzScaleBehavior.key(newPoint.time),
            (a: InternalTimeScalePoint, b: number) => this._horzScaleBehavior.key(a.time) < b,
        );

        // yes, I know that this array is readonly and this change is intended to make it performative
        // we marked _sortedTimePoints array as readonly to avoid modifying this array anywhere else
        // but this place is exceptional case due performance reasons, sorry
        (this._sortedTimePoints as InternalTimeScalePoint[]).splice(insertIndex, 0, newPoint);

        for (const [offset, point] of this._sortedTimePoints.slice(insertIndex).entries()) {
            assignIndexToPointData(point.pointData, (insertIndex + offset) as TimePointIndex);
        }

        this._horzScaleBehavior.fillWeightsForPoints(this._sortedTimePoints, insertIndex);

        return this._getUpdateResponse(series, insertIndex, info);
    }

    private _updateLastSeriesRow(
        series: Series<SeriesType>,
        plotRow: SeriesPlotRow<SeriesType> | WhitespacePlotRow,
    ): void {
        let seriesData = this._seriesRowsBySeries.get(series);
        if (seriesData === undefined) {
            seriesData = [];
            this._seriesRowsBySeries.set(series, seriesData);
        }

        const lastSeriesRow = seriesData[seriesData.length - 1] ?? null;

        if (
            lastSeriesRow === null ||
            this._horzScaleBehavior.key(plotRow.time) > this._horzScaleBehavior.key(lastSeriesRow.time)
        ) {
            if (isSeriesPlotRow(plotRow)) {
                seriesData.push(plotRow);
            }
        } else {
            if (isSeriesPlotRow(plotRow)) {
                seriesData[seriesData.length - 1] = plotRow;
            } else {
                seriesData.splice(-1, 1);
            }
        }

        this._seriesLastTimePoint.set(series, plotRow.time);
    }

    private _setRowsToSeries(
        series: Series<SeriesType>,
        seriesRows: (SeriesPlotRow<SeriesType> | WhitespacePlotRow)[],
    ): void {
        const lastRow = seriesRows[seriesRows.length - 1];
        if (lastRow !== undefined) {
            this._seriesRowsBySeries.set(series, seriesRows.filter(isSeriesPlotRow));
            this._seriesLastTimePoint.set(series, lastRow.time);
        } else {
            this._seriesRowsBySeries.delete(series);
            this._seriesLastTimePoint.delete(series);
        }
    }

    private _cleanupPointsData(): void {
        // let's treat all current points as "potentially removed"
        // we could create an array with actually potentially removed points
        // but most likely this array will be similar to _sortedTimePoints so let's avoid using additional memory
        // note that we can use _sortedTimePoints here since a point might be removed only it was here previously
        for (const point of this._sortedTimePoints) {
            if (point.pointData.mapping.size === 0) {
                this._pointDataByTimePoint.delete(this._horzScaleBehavior.key(point.time));
            }
        }
    }

    /**
     * Sets new time scale and make indexes valid for all series
     *
     * @returns The index of the first changed point or `-1` if there is no change.
     */
    private _replaceTimeScalePoints(newTimePoints: InternalTimeScalePoint[]): number {
        let firstChangedPointIndex = -1;

        // search the first different point and "syncing" time weight by the way
        for (let index = 0; index < this._sortedTimePoints.length && index < newTimePoints.length; ++index) {
            const oldPoint = this._sortedTimePoints[index];
            const newPoint = newTimePoints[index];
            if (oldPoint === undefined || newPoint === undefined) continue;

            if (this._horzScaleBehavior.key(oldPoint.time) !== this._horzScaleBehavior.key(newPoint.time)) {
                firstChangedPointIndex = index;
                break;
            }

            // re-assign point's time weight for points if time is the same (and all prior times was the same)
            newPoint.timeWeight = oldPoint.timeWeight;

            assignIndexToPointData(newPoint.pointData, index as TimePointIndex);
        }

        if (firstChangedPointIndex === -1 && this._sortedTimePoints.length !== newTimePoints.length) {
            // the common part of the prev and the new points are the same
            // so the first changed point is the next after the common part
            firstChangedPointIndex = Math.min(this._sortedTimePoints.length, newTimePoints.length);
        }

        if (firstChangedPointIndex === -1) {
            // if no time scale changed, then do nothing
            return -1;
        }

        // if time scale points are changed that means that we need to make full update to all series (with clearing points)
        // but first we need to synchronize indexes and re-fill time weights
        for (const [offset, point] of newTimePoints.slice(firstChangedPointIndex).entries()) {
            assignIndexToPointData(point.pointData, (firstChangedPointIndex + offset) as TimePointIndex);
        }

        // re-fill time weights for point after the first changed one
        this._horzScaleBehavior.fillWeightsForPoints(newTimePoints, firstChangedPointIndex);

        this._sortedTimePoints = newTimePoints;

        return firstChangedPointIndex;
    }

    private _getBaseIndex(): TimePointIndex | null {
        if (this._seriesRowsBySeries.size === 0) {
            // if we have no data then 'reset' the base index to null
            return null;
        }

        let baseIndex = 0 as TimePointIndex;

        this._seriesRowsBySeries.forEach((data: SeriesPlotRow<SeriesType>[]) => {
            const lastRow = data[data.length - 1];
            if (lastRow !== undefined) {
                baseIndex = Math.max(baseIndex, lastRow.index) as TimePointIndex;
            }
        });

        return baseIndex;
    }

    private _getUpdateResponse(
        updatedSeries: Series<SeriesType>,
        firstChangedPointIndex: number,
        info?: SeriesUpdateInfo,
    ): DataUpdateResponse {
        const dataUpdateResponse: DataUpdateResponse = {
            series: new Map(),
            timeScale: {
                baseIndex: this._getBaseIndex(),
            },
        };

        if (firstChangedPointIndex !== -1) {
            // Upstream note: could be narrowed to the series with data after
            // firstChangedPointIndex
            this._seriesRowsBySeries.forEach((data: SeriesPlotRow<SeriesType>[], s: Series<SeriesType>) => {
                dataUpdateResponse.series.set(s, {
                    data,
                    info: s === updatedSeries ? info : undefined,
                });
            });

            // if the series data was set to [] it will have already been removed from _seriesRowBySeries
            // meaning the forEach above won't add the series to the data update response
            // so we handle that case here
            if (!this._seriesRowsBySeries.has(updatedSeries)) {
                dataUpdateResponse.series.set(updatedSeries, { data: [], info });
            }

            dataUpdateResponse.timeScale.points = this._sortedTimePoints;
            dataUpdateResponse.timeScale.firstChangedPointIndex = firstChangedPointIndex as TimePointIndex;
        } else {
            const seriesData = this._seriesRowsBySeries.get(updatedSeries);
            // if no seriesData found that means that we just removed the series
            dataUpdateResponse.series.set(updatedSeries, { data: seriesData ?? [], info });
        }

        return dataUpdateResponse;
    }
}
