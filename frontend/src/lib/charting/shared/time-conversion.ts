/**
 * Turns the chart's `Time` — which may be a timestamp, a business day object or
 * a date string — into a plain epoch second, and an epoch second back into one.
 */
import { nominal } from '@/lib/charting/engine/helpers/nominal';
import { convertTime, timePointOf } from '@/lib/charting/engine/model/time/time-utils';
import { type Time, type UTCTimestamp } from '@/lib/charting/engine/model/time/types';

/**
 * Collapses any of the three `Time` shapes — epoch seconds, a `BusinessDay`
 * object, or an ISO date string — down to epoch seconds.
 *
 * The drawing tools each used to hand-roll this against `new Date(year, month,
 * day)`, which reads a business day in the viewer's local zone; a business day
 * is UTC, so every one of them was off by the local offset. `convertTime` is
 * the library's own converter and is the only one that gets this right.
 */
export function timeToTimestamp(time: Time): UTCTimestamp {
    return timePointOf(convertTime(time)).timestamp;
}

/** An epoch second as the chart's `Time`: the form an intraday bar is given in. */
export function secondsToTime(seconds: number): Time {
    return nominal<UTCTimestamp>(seconds);
}
