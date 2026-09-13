/**
 * Turns the chart's `Time` — which may be a timestamp, a business day object or
 * a date string — into a plain epoch second.
 */
import { convertTime } from '@/lib/charting/engine/model/time/time-utils';
import { type Time, type TimePoint, type UTCTimestamp } from '@/lib/charting/engine/model/time/types';

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
    // InternalHorzScaleItem is nominal and opaque; upstream reads it back as a
    // TimePoint the same way wherever it needs the underlying seconds
    return (convertTime(time) as unknown as TimePoint).timestamp;
}
