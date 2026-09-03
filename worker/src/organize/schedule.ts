/** When the nightly run fires. */
import { config } from '@/lib/config.js';

const NY_PARTS = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});

/**
 * Milliseconds until the next run hour in New York.
 * Derived from the current local time of day rather than by constructing a
 * target date, because the offset between here and New York is the thing that
 * moves and reading it back out of a formatted date is what accounts for it.
 */
export function msUntilNextRun(now: Date = new Date()): number {
    const parts = NY_PARTS.formatToParts(now);
    const value = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? 0);

    // 24 rather than 0 for midnight: `hour12: false` renders it either way
    // depending on the runtime, and both mean the same instant
    const hour = value('hour') % 24;
    const secondsIntoDay = hour * 3600 + value('minute') * 60 + value('second');
    const target = config.organize.runHourEt * 3600;
    const until = target - secondsIntoDay;

    return (until > 0 ? until : until + 24 * 3600) * 1000;
}
