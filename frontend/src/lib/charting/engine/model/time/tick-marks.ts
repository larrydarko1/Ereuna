/**
 * The time axis' marks, kept grouped by weight so the axis can take the
 * heaviest ones that fit without sorting the whole set each frame.
 */
import { lowerBound } from '@/lib/charting/engine/helpers/algorithms';
import { getDefined } from '@/lib/charting/engine/helpers/assertions';
import { type InternalHorzScaleItem } from '@/lib/charting/engine/model/time/ihorz-scale-behavior';
import {
    type TickMarkWeightValue,
    type TimePointIndex,
    type TimeScalePoint,
} from '@/lib/charting/engine/model/time/time-data';

/**
 * Tick mark for the horizontal scale.
 */
export type TickMark = {
    /** Index */
    index: TimePointIndex;
    /** Time / Coordinate */
    time: InternalHorzScaleItem;
    /** Weight of the tick mark */
    weight: TickMarkWeightValue;
    /** Original value for the `time` property */
    originalTime: unknown;
};

type MarksCache = {
    maxIndexesPerMark: number;
    marks: readonly TickMark[];
};

export class TickMarks {
    private _marksByWeight = new Map<TickMarkWeightValue, TickMark[]>();
    private _cache: MarksCache | null = null;
    private _uniformDistribution = false;

    public setUniformDistribution(val: boolean): void {
        this._uniformDistribution = val;
        this._cache = null;
    }

    public setTimeScalePoints(newPoints: readonly TimeScalePoint[], firstChangedPointIndex: number): void {
        this._removeMarksSinceIndex(firstChangedPointIndex);

        this._cache = null;

        for (let index = firstChangedPointIndex; index < newPoints.length; ++index) {
            const point = newPoints[index];
            if (point === undefined) continue;

            let marksForWeight = this._marksByWeight.get(point.timeWeight);
            if (marksForWeight === undefined) {
                marksForWeight = [];
                this._marksByWeight.set(point.timeWeight, marksForWeight);
            }

            marksForWeight.push({
                index: index as TimePointIndex,
                time: point.time,
                weight: point.timeWeight,
                originalTime: point.originalTime,
            });
        }
    }

    public build(spacing: number, maxWidth: number): readonly TickMark[] {
        const maxIndexesPerMark = Math.ceil(maxWidth / spacing);
        if (this._cache === null || this._cache.maxIndexesPerMark !== maxIndexesPerMark) {
            this._cache = {
                marks: this._buildMarksImpl(maxIndexesPerMark),
                maxIndexesPerMark,
            };
        }

        return this._cache.marks;
    }

    private _removeMarksSinceIndex(sinceIndex: number): void {
        if (sinceIndex === 0) {
            this._marksByWeight.clear();
            return;
        }

        const weightsToClear: TickMarkWeightValue[] = [];

        this._marksByWeight.forEach((marks: TickMark[], timeWeight: TickMarkWeightValue) => {
            const firstMark = marks[0];
            if (firstMark === undefined || sinceIndex <= firstMark.index) {
                weightsToClear.push(timeWeight);
            } else {
                marks.splice(
                    lowerBound(marks, sinceIndex, (tm: TickMark) => tm.index < sinceIndex),
                    Infinity,
                );
            }
        });

        for (const weight of weightsToClear) {
            this._marksByWeight.delete(weight);
        }
    }

    private _buildMarksImpl(maxIndexesPerMark: number): readonly TickMark[] {
        let marks: TickMark[] = [];

        for (const weight of Array.from(this._marksByWeight.keys()).sort((a: number, b: number) => b - a)) {
            const currentWeight = this._marksByWeight.get(weight);
            if (currentWeight === undefined) {
                continue;
            }

            // Built tickMarks are now prevMarks, and marks it as new array
            const prevMarks = marks;
            marks = [];

            const prevMarksLength = prevMarks.length;
            let prevMarksPointer = 0;
            const currentWeightLength = currentWeight.length;

            let leftIndex = -Infinity;
            for (let i = 0; i < currentWeightLength; i++) {
                const mark = currentWeight[i];
                if (mark === undefined) continue;

                const currentIndex = mark.index;

                // Carry over every heavier mark that sits left of this one, so
                // that the gaps either side of it can be measured
                const carried = carryMarksBefore(prevMarks, prevMarksPointer, currentIndex);
                prevMarksPointer = carried.pointer;
                marks.push(...carried.moved);
                if (carried.moved.length > 0) {
                    leftIndex = getDefined(carried.moved[carried.moved.length - 1]).index;
                }
                const fits =
                    carried.rightIndex - currentIndex >= maxIndexesPerMark &&
                    currentIndex - leftIndex >= maxIndexesPerMark;

                // A mark that does not fit is dropped — unless the caller asked
                // for uniform spacing, in which case this whole weight is
                // abandoned and the heavier one stands
                if (!fits && this._uniformDistribution) {
                    return prevMarks;
                }

                if (!fits) continue;

                marks.push(mark);
                leftIndex = currentIndex;
            }

            // Place all unused tickMarks into new array;
            marks.push(...prevMarks.slice(prevMarksPointer, prevMarksLength));
        }

        return marks;
    }
}

/**
 * Moves every already-placed mark that sits left of `currentIndex` across to the
 * new list, and reports the index of the first one that does not — which is the
 * right-hand neighbour `currentIndex` has to clear.
 */
function carryMarksBefore(
    prevMarks: readonly TickMark[],
    pointer: number,
    currentIndex: TimePointIndex,
): { pointer: number; moved: TickMark[]; rightIndex: number } {
    const moved: TickMark[] = [];

    while (pointer < prevMarks.length) {
        const lastMark = prevMarks[pointer];
        if (lastMark === undefined) break;

        if (lastMark.index >= currentIndex) {
            return { pointer, moved, rightIndex: lastMark.index };
        }

        pointer++;
        moved.push(lastMark);
    }

    return { pointer, moved, rightIndex: Infinity };
}
