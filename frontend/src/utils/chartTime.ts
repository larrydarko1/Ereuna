/**
 * The renderer's `Time` in the two forms the rest of the app needs it.
 * A daily or weekly bar is a business day — the string `YYYY-MM-DD`, with no
 * time and no zone, because a session is a day rather than an instant. An
 * intraday bar is a UTC timestamp in seconds. Both are `Time` to the chart, so
 * anything that sorts, compares or prints one has to know which it is holding.
 */
import type { Time } from '@/lib/lightweight-charts';

/** Seconds since the epoch, for ordering bars and cutting a series at a point. */
export function timeValue(time: Time): number {
    if (typeof time === 'number') return time;
    if (typeof time === 'string') return Date.parse(`${time}T00:00:00Z`) / 1000;

    // A BusinessDay object. Ours never produces one, but the renderer's type
    // allows it and a series loaded from elsewhere could carry one.
    return Date.UTC(time.year, time.month - 1, time.day) / 1000;
}

/**
 * A stable identity for a bar, safe as a `Set` or `Map` key.
 * `String(time)` was doing this before, which is correct for the two shapes we
 * produce and silently wrong for the third: every BusinessDay stringifies to
 * `[object Object]`, so a series carrying one would de-duplicate down to a
 * single bar.
 */
export function timeKey(time: Time): string {
    return typeof time === 'string' ? time : String(timeValue(time));
}

/** The instant a bar sits at, or null when the value will not parse. */
export function timeToDate(time: Time): Date | null {
    const seconds = timeValue(time);
    return Number.isFinite(seconds) ? new Date(seconds * 1000) : null;
}

/** `YYYY-MM-DD`, which is what an `<input type="date">` and the marker keys use. */
export function timeToIsoDate(time: Time): string {
    if (typeof time === 'string') return time.slice(0, 10);
    const date = timeToDate(time);
    return date === null ? '' : date.toISOString().slice(0, 10);
}
