/**
 * The index types the horizontal scale works in, and the ranges over them.
 *
 * A `TimePointIndex` is a position in the series' own data and a `Logical` is a
 * position on the scale, which may be fractional and may sit beyond the data —
 * they are branded apart because using one for the other is silently wrong.
 */
import { lowerBound, upperBound } from '@/lib/lightweight-charts/helpers/algorithms';
import { type Nominal } from '@/lib/lightweight-charts/helpers/nominal';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import { type InternalHorzScaleItem } from '@/lib/lightweight-charts/model/ihorz-scale-behavior';
import { type RangeImpl } from '@/lib/lightweight-charts/model/range-impl';

/**
 * Weight of the tick mark. @see TickMarkWeight enum
 */
export type TickMarkWeightValue = Nominal<number, 'TickMarkWeightValue'>;

/**
 * Represents a point on the time scale
 */
export type TimeScalePoint = {
    /** Weight of the point */
    readonly timeWeight: TickMarkWeightValue;
    /** Time of the point */
    readonly time: InternalHorzScaleItem;
    /** Original time for the point */
    readonly originalTime: unknown;
};

/**
 * Represents a generic range `from` one value `to` another.
 */
export type Range<T> = {
    /**
     * The from value. The start of the range.
     */
    from: T;
    /**
     * The to value. The end of the range.
     */
    to: T;
};

export type TimePointsRange = Range<Omit<TimeScalePoint, 'timeWeight'>>;

/**
 * Index for a point on the horizontal (time) scale.
 */
export type TimePointIndex = Nominal<number, 'TimePointIndex'>;

/**
 * Represents the `to` or `from` number in a logical range.
 */
export type Logical = Nominal<number, 'Logical'>;

/**
 * A logical range is an object with 2 properties: `from` and `to`, which are numbers and represent logical indexes on the time scale.
 *
 * The starting point of the time scale's logical range is the first data item among all series.
 * Before that point all indexes are negative, starting from that point - positive.
 *
 * Indexes might have fractional parts, for instance 4.2, due to the time-scale being continuous rather than discrete.
 *
 * Integer part of the logical index means index of the fully visible bar.
 * Thus, if we have 5.2 as the last visible logical index (`to` field), that means that the last visible bar has index 5, but we also have partially visible (for 20%) 6th bar.
 * Half (e.g. 1.5, 3.5, 10.5) means exactly a middle of the bar.
 */
export type LogicalRange = Range<Logical>;

export type TimedValue = {
    time: TimePointIndex;
    x: Coordinate;
};

export type SeriesItemsIndexesRange = Range<number>;

export function visibleTimedValues(
    items: TimedValue[],
    range: RangeImpl<TimePointIndex>,
    options: { extended: boolean },
): SeriesItemsIndexesRange {
    const firstBar = range.left();
    const lastBar = range.right();

    const from = lowerBound(items, firstBar, lowerBoundItemsCompare);
    const to = upperBound(items, lastBar, upperBoundItemsCompare);

    if (!options.extended) {
        return { from, to };
    }

    let extendedFrom = from;
    let extendedTo = to;

    const fromItem = items[from];
    if (from > 0 && fromItem !== undefined && fromItem.time >= firstBar) {
        extendedFrom = from - 1;
    }

    const beforeToItem = items[to - 1];
    if (to > 0 && to < items.length && beforeToItem !== undefined && beforeToItem.time <= lastBar) {
        extendedTo = to + 1;
    }

    return { from: extendedFrom, to: extendedTo };
}

function lowerBoundItemsCompare(item: TimedValue, time: TimePointIndex): boolean {
    return item.time < time;
}

function upperBoundItemsCompare(item: TimedValue, time: TimePointIndex): boolean {
    return time < item.time;
}
