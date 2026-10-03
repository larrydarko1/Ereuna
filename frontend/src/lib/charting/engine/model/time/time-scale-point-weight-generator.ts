/**
 * Assigns each point a weight from how round its time is — a year boundary
 * outranks a month, a month a day, and so on down to the second.
 *
 * The time axis draws the heaviest marks it has room for, so the labels thin out
 * evenly as the chart is zoomed out instead of dropping in arbitrary order.
 */
import { type Mutable } from '@/lib/charting/engine/helpers/mutable';
import { nominal } from '@/lib/charting/engine/helpers/nominal';
import { type TickMarkWeightValue, type TimeScalePoint } from '@/lib/charting/engine/model/time/time-data';
import { timePointOf } from '@/lib/charting/engine/model/time/time-utils';
import { TickMarkWeight } from '@/lib/charting/engine/model/time/types';

type WeightDivisor = {
    divisor: number;
    weight: TickMarkWeight;
};

const intradayWeightDivisors: WeightDivisor[] = [
    { divisor: seconds(1), weight: TickMarkWeight.Second },
    { divisor: minutes(1), weight: TickMarkWeight.Minute1 },
    { divisor: minutes(5), weight: TickMarkWeight.Minute5 },
    { divisor: minutes(30), weight: TickMarkWeight.Minute30 },
    { divisor: hours(1), weight: TickMarkWeight.Hour1 },
    { divisor: hours(3), weight: TickMarkWeight.Hour3 },
    { divisor: hours(6), weight: TickMarkWeight.Hour6 },
    { divisor: hours(12), weight: TickMarkWeight.Hour12 },
];

export function fillWeightsForPoints(sortedTimePoints: readonly Mutable<TimeScalePoint>[], startIndex = 0): void {
    if (sortedTimePoints.length === 0) {
        return;
    }

    const pointBefore = sortedTimePoints[startIndex - 1];
    let prevTime = startIndex === 0 || pointBefore === undefined ? null : timePointOf(pointBefore.time).timestamp;
    let prevDate = prevTime !== null ? new Date(prevTime * 1000) : null;

    let totalTimeDiff = 0;

    for (let index = startIndex; index < sortedTimePoints.length; ++index) {
        const currentPoint = sortedTimePoints[index];
        if (currentPoint === undefined) continue;

        const currentDate = new Date(timePointOf(currentPoint.time).timestamp * 1000);

        if (prevDate !== null) {
            currentPoint.timeWeight = nominal<TickMarkWeightValue>(weightByTime(currentDate, prevDate));
        }

        totalTimeDiff +=
            timePointOf(currentPoint.time).timestamp - (prevTime ?? timePointOf(currentPoint.time).timestamp);

        prevTime = timePointOf(currentPoint.time).timestamp;
        prevDate = currentDate;
    }

    const firstPoint = sortedTimePoints[0];
    if (startIndex === 0 && firstPoint !== undefined && sortedTimePoints.length > 1) {
        // let's guess a weight for the first point
        // let's say the previous point was average time back in the history
        const averageTimeDiff = Math.ceil(totalTimeDiff / (sortedTimePoints.length - 1));
        const approxPrevDate = new Date((timePointOf(firstPoint.time).timestamp - averageTimeDiff) * 1000);
        firstPoint.timeWeight = nominal<TickMarkWeightValue>(
            weightByTime(new Date(timePointOf(firstPoint.time).timestamp * 1000), approxPrevDate),
        );
    }
}

function hours(count: number): number {
    return count * 60 * 60 * 1000;
}

function minutes(count: number): number {
    return count * 60 * 1000;
}

function seconds(count: number): number {
    return count * 1000;
}

function weightByTime(currentDate: Date, prevDate: Date): TickMarkWeight {
    if (currentDate.getUTCFullYear() !== prevDate.getUTCFullYear()) {
        return TickMarkWeight.Year;
    }
    if (currentDate.getUTCMonth() !== prevDate.getUTCMonth()) {
        return TickMarkWeight.Month;
    }
    if (currentDate.getUTCDate() !== prevDate.getUTCDate()) {
        return TickMarkWeight.Day;
    }

    for (const { divisor, weight } of [...intradayWeightDivisors].reverse()) {
        if (Math.floor(prevDate.getTime() / divisor) !== Math.floor(currentDate.getTime() / divisor)) {
            return weight;
        }
    }

    return TickMarkWeight.LessThanSecond;
}
