/**
 * US market session helpers — pure functions, no I/O.
 * Regular trading hours are 09:30–16:00 America/New_York. The offset from UTC
 * changes with daylight saving, so the boundary is resolved through `Intl`
 * rather than a hardcoded 13:30–20:00 UTC window, which is only correct for
 * seven months of the year.
 * Exchange holidays are not modelled here: cache TTLs are the only consumer,
 * and holding price data for five minutes instead of one on a closed holiday is
 * not a correctness problem.
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
    const parts = NY_PARTS.formatToParts(now);
    const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? '';

    if (WEEKEND.has(get('weekday'))) return false;

    const minutes = Number(get('hour')) * 60 + Number(get('minute'));
    return minutes >= OPEN_MINUTES && minutes < CLOSE_MINUTES;
}

/**
 * Midnight (New York) on the most recent weekday, today included.
 * The dashboard reads "today's news" against this rather than against the
 * calendar day, so a Sunday morning still shows Friday's headlines instead of
 * an empty page. Holidays are not modelled: a holiday shows the previous
 * session's news, which is the same thing the market itself is doing.
 */
export function lastTradingDay(now: Date = new Date()): Date {
    const parts = NY_DATE.formatToParts(now);
    const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? '';

    const day = new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00Z`);
    const weekday = get('weekday');

    if (weekday === 'Sun') day.setUTCDate(day.getUTCDate() - 2);
    else if (weekday === 'Sat') day.setUTCDate(day.getUTCDate() - 1);

    return day;
}

const NY_DATE = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
});
