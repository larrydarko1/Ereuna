/** When the nightly run fires. */
import { config } from '@/lib/config.js';

const NY_PARTS = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});

const DAY_SECONDS = 24 * 3600;

/**
 * Milliseconds until the next run hour in New York.
 * The first guess assumes a 24-hour day. The night the clocks change, the day
 * is 23 or 25 hours and the guess lands an hour off, so it is read back on New
 * York's clock and moved by however far it missed.
 */
export function msUntilNextRun(now: Date = new Date()): number {
    const target = config.organize.runHourEt * 3600;
    const until = target - secondsIntoDay(now);
    const guess = now.getTime() + (until > 0 ? until : until + DAY_SECONDS) * 1000;

    // A miss past twelve hours is the same miss measured across midnight
    const miss = target - secondsIntoDay(new Date(guess));
    const correction = Math.abs(miss) > DAY_SECONDS / 2 ? miss - Math.sign(miss) * DAY_SECONDS : miss;

    return guess + correction * 1000 - now.getTime();
}

function secondsIntoDay(at: Date): number {
    const parts = NY_PARTS.formatToParts(at);
    const value = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? 0);

    // 24 rather than 0 for midnight: `hour12: false` renders it either way
    // depending on the runtime, and both mean the same instant
    return (value('hour') % 24) * 3600 + value('minute') * 60 + value('second');
}
