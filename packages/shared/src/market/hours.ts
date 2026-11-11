/**
 * US market session helpers — pure functions, no I/O.
 * Regular trading hours are 09:30–16:00 America/New_York. The offset from UTC
 * changes with daylight saving, so the boundary is resolved through `Intl`
 * rather than a hardcoded 13:30–20:00 UTC window, which is only correct for
 * seven months of the year.
 * Exchange holidays are not modelled here: the ingestor checks them itself, and
 * for the API's cache TTLs holding price data for five minutes instead of one
 * on a closed holiday is not a correctness problem.
 */

const NY_PARTS = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
});

const OPEN_MINUTES = 9 * 60 + 30;
const CLOSE_MINUTES = 16 * 60;
const WEEKEND = new Set(['Sat', 'Sun']);

/** True during regular US trading hours on a weekday. */
export function isMarketHours(now: Date = new Date()): boolean {
    const { weekday, minutes } = toNewYork(now);
    if (WEEKEND.has(weekday)) return false;
    return minutes >= OPEN_MINUTES && minutes < CLOSE_MINUTES;
}

/**
 * The instant the regular session closes on `day`'s UTC calendar date: 20:00
 * UTC under daylight time, 21:00 UTC under standard time.
 * The offset is read at 16:00 UTC, which is late morning in New York and so
 * already past the 02:00 daylight-saving change on the days it happens.
 */
export function sessionClose(day: Date): Date {
    const closeAsIfUtc = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) + CLOSE_MINUTES * 60_000;
    const offsetMinutes = toNewYork(new Date(closeAsIfUtc)).minutes - CLOSE_MINUTES;
    return new Date(closeAsIfUtc - offsetMinutes * 60_000);
}

function toNewYork(at: Date): { weekday: string; minutes: number } {
    const parts = NY_PARTS.formatToParts(at);
    const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? '';
    return { weekday: get('weekday'), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}
