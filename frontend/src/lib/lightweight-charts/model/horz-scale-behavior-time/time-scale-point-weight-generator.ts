import { type Mutable } from '@/lib/lightweight-charts/helpers/mutable';

import { type InternalHorzScaleItem } from '@/lib/lightweight-charts/model/ihorz-scale-behavior';
import { type TickMarkWeightValue, type TimeScalePoint } from '@/lib/lightweight-charts/model/time-data';
import { TickMarkWeight, type TimePoint } from '@/lib/lightweight-charts/model/horz-scale-behavior-time/types';

function hours(count: number): number {
    return count * 60 * 60 * 1000;
}

function minutes(count: number): number {
    return count * 60 * 1000;
}

function seconds(count: number): number {
    return count * 1000;
}

type WeightDivisor = {
    divisor: number;
    weight: TickMarkWeight;
}

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

function weightByTime(currentDate: Date, prevDate: Date): TickMarkWeight {
    if (currentDate.getUTCFullYear() !== prevDate.getUTCFullYear()) {
        return TickMarkWeight.Year;
    } if (currentDate.getUTCMonth() !== prevDate.getUTCMonth()) {
        return TickMarkWeight.Month;
    } if (currentDate.getUTCDate() !== prevDate.getUTCDate()) {
        return TickMarkWeight.Day;
    }

    for (const { divisor, weight } of [...intradayWeightDivisors].reverse()) {
        if (Math.floor(prevDate.getTime() / divisor) !== Math.floor(currentDate.getTime() / divisor)) {
            return weight;
        }
    }

    return TickMarkWeight.LessThanSecond;
}

function cast(t: InternalHorzScaleItem): TimePoint {
    return t as unknown as TimePoint;
}

export function fillWeightsForPoints(
    sortedTimePoints: readonly Mutable<TimeScalePoint>[],
    startIndex = 0,
): void {
    if (sortedTimePoints.length === 0) {
        return;
    }

    const pointBefore = sortedTimePoints[startIndex - 1];
    let prevTime = startIndex === 0 || pointBefore === undefined ? null : cast(pointBefore.time).timestamp;
    let prevDate = prevTime !== null ? new Date(prevTime * 1000) : null;

    let totalTimeDiff = 0;

    for (let index = startIndex; index < sortedTimePoints.length; ++index) {
        const currentPoint = sortedTimePoints[index];
        if (currentPoint === undefined) continue;

        const currentDate = new Date(cast(currentPoint.time).timestamp * 1000);

        if (prevDate !== null) {
            currentPoint.timeWeight = weightByTime(currentDate, prevDate) as TickMarkWeightValue;
        }

        totalTimeDiff += cast(currentPoint.time).timestamp - (prevTime || cast(currentPoint.time).timestamp);

        prevTime = cast(currentPoint.time).timestamp;
        prevDate = currentDate;
    }

    const firstPoint = sortedTimePoints[0];
    if (startIndex === 0 && firstPoint !== undefined && sortedTimePoints.length > 1) {
        // let's guess a weight for the first point
        // let's say the previous point was average time back in the history
        const averageTimeDiff = Math.ceil(totalTimeDiff / (sortedTimePoints.length - 1));
        const approxPrevDate = new Date((cast(firstPoint.time).timestamp - averageTimeDiff) * 1000);
        firstPoint.timeWeight = weightByTime(
            new Date(cast(firstPoint.time).timestamp * 1000),
            approxPrevDate,
        ) as TickMarkWeightValue;
    }
}
