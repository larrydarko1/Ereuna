/**
 * US market session helpers — pure functions, no I/O.
 * Regular trading hours are 09:30–16:00 America/New_York, or 09:30–13:00 on the
 * exchange's three early-close days. The offset from UTC changes with daylight
 * saving, so the boundary is resolved through `Intl` rather than a hardcoded
 * 13:30–20:00 UTC window, which is only correct for seven months of the year.
 * Exchange holidays are not modelled here: the ingestor checks them itself, and
 * for the API's cache TTLs holding price data for five minutes instead of one
 * on a closed holiday is not a correctness problem.
 */

const NY_PARTS = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
});

const OPEN_MINUTES = 9 * 60 + 30;
const CLOSE_MINUTES = 16 * 60;
const EARLY_CLOSE_MINUTES = 13 * 60;
const WEEKEND = new Set(['Sat', 'Sun']);
const NOVEMBER = 10;
const DECEMBER = 11;
const JULY = 6;
const FRIDAY = 5;

/** True during regular US trading hours on a weekday. */
export function isMarketHours(now: Date = new Date()): boolean {
    const { weekday, minutes, year, month, day } = toNewYork(now);
    if (WEEKEND.has(weekday)) return false;
    return minutes >= OPEN_MINUTES && minutes < closeMinutes(year, month, day);
}

/**
 * The instant the regular session closes on `day`'s UTC calendar date: 16:00
 * New York, or 13:00 on an early-close day.
 * The offset is read at that close hour taken as UTC, which is morning in New
 * York and so already past the 02:00 daylight-saving change on the days it happens.
 */
export function sessionClose(day: Date): Date {
    const close = closeMinutes(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
    const closeAsIfUtc = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) + close * 60_000;
    const offsetMinutes = toNewYork(new Date(closeAsIfUtc)).minutes - close;
    return new Date(closeAsIfUtc - offsetMinutes * 60_000);
}

/**
 * The close, in minutes after New York midnight, on a date given by its parts
 * (`month` counted from 0).
 * The exchange closes at 13:00 the day after Thanksgiving, and on 3 July and
 * 24 December when they fall Monday to Thursday. On a Friday those two are the
 * observed holiday itself, and at the weekend there is no session.
 */
function closeMinutes(year: number, month: number, day: number): number {
    const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
    // Thanksgiving is the fourth Thursday, 22–28 November, so the day after is the Friday from 23 to 29
    const afterThanksgiving = month === NOVEMBER && weekday === FRIDAY && day >= 23 && day <= 29;
    const eve = (month === JULY && day === 3) || (month === DECEMBER && day === 24);
    const early = afterThanksgiving || (eve && weekday >= 1 && weekday <= 4);
    return early ? EARLY_CLOSE_MINUTES : CLOSE_MINUTES;
}

function toNewYork(at: Date): { weekday: string; minutes: number; year: number; month: number; day: number } {
    const parts = NY_PARTS.formatToParts(at);
    const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? '';
    return {
        weekday: get('weekday'),
        minutes: Number(get('hour')) * 60 + Number(get('minute')),
        year: Number(get('year')),
        month: Number(get('month')) - 1,
        day: Number(get('day')),
    };
}
