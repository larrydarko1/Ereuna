/** The exchange holiday calendar, computed rather than fetched. */

/** A holiday, as the ingestor and the client read it. */
export type Holiday = {
    date: string; // YYYY-MM-DD in the exchange's own timezone
    name: string;
};

const NTH_WEEKDAY = [
    { month: 0, weekday: 1, nth: 3, name: 'Martin Luther King Jr. Day' },
    { month: 1, weekday: 1, nth: 3, name: "Washington's Birthday" },
    { month: 8, weekday: 1, nth: 1, name: 'Labor Day' },
    { month: 10, weekday: 4, nth: 4, name: 'Thanksgiving Day' },
] as const;

const FIXED = [
    { month: 0, day: 1, name: "New Year's Day" },
    { month: 5, day: 19, name: 'Juneteenth National Independence Day' },
    { month: 6, day: 4, name: 'Independence Day' },
    { month: 11, day: 25, name: 'Christmas Day' },
] as const;

const DAY = 86_400_000;

/** Every exchange holiday in `year`, in date order. */
export function holidaysFor(year: number): Holiday[] {
    const holidays: Holiday[] = [
        ...FIXED.map(({ month, day, name }) => ({ date: iso(observed(Date.UTC(year, month, day))), name })),
        ...NTH_WEEKDAY.map(({ month, weekday, nth, name }) => ({ date: iso(nthWeekday(year, month, weekday, nth)), name })),
        { date: iso(lastMonday(year, 4)), name: 'Memorial Day' },
        { date: iso(easter(year) - 2 * DAY), name: 'Good Friday' },
    ];

    return holidays.sort((left, right) => left.date.localeCompare(right.date));
}

/** Holidays for `years` calendar years starting at `from`. */
export function holidayCalendar(from: number, years = 2): Holiday[] {
    return Array.from({ length: years }, (_, offset) => holidaysFor(from + offset)).flat();
}

/**
 * A fixed-date holiday moved off the weekend.
 * A Saturday holiday is taken on the Friday before and a Sunday one on the
 * Monday after, which is the rule the exchange publishes.
 */
function observed(at: number): number {
    const weekday = new Date(at).getUTCDay();
    if (weekday === 6) return at - DAY;
    if (weekday === 0) return at + DAY;
    return at;
}

/** The `nth` `weekday` of `month`, as a UTC timestamp. */
function nthWeekday(year: number, month: number, weekday: number, nth: number): number {
    const first = Date.UTC(year, month, 1);
    const offset = (weekday - new Date(first).getUTCDay() + 7) % 7;
    return first + (offset + (nth - 1) * 7) * DAY;
}

/** The last Monday of `month`. */
function lastMonday(year: number, month: number): number {
    const last = Date.UTC(year, month + 1, 0);
    const weekday = new Date(last).getUTCDay();
    return last - ((weekday - 1 + 7) % 7) * DAY;
}

/**
 * Easter Sunday, by the anonymous Gregorian algorithm.
 * Good Friday is the only exchange holiday tied to the lunar calendar, which is
 * why this is here at all.
 */
function easter(year: number): number {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return Date.UTC(year, month - 1, day);
}

function iso(at: number): string {
    return new Date(at).toISOString().slice(0, 10);
}
