/**
 * When there is a session to ingest.
 * Regular hours come from the shared helper the API uses, so the two cannot
 * disagree about whether the market is open. Holidays are read from Mongo,
 * because that calendar is data the organizer maintains rather than a rule.
 * The holiday read fails open. A Mongo blip on a normal trading morning would
 * otherwise silence the feed for the whole session, which is a far worse
 * failure than ingesting a few hours of nothing on a closed holiday.
 */
import type { StatsDoc } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';

export { isMarketHours } from '@ereuna/shared';

const NY_DATE = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/**
 * The exchange holidays the organizer maintains, as `YYYY-MM-DD` strings.
 * This is where the fail-open lives: an empty list reads as "no holiday today",
 * so a Mongo blip costs a few hours of ingesting nothing rather than a silent
 * feed for the whole session.
 */
export async function getHolidays(): Promise<readonly string[]> {
    try {
        const document = await getDb().collection<StatsDoc>('Stats').findOne({ _id: 'Holidays' });
        const holidays = document?.Holidays;
        if (!Array.isArray(holidays)) {
            logger.warn('No holiday calendar in Stats — treating today as a trading day');
            return [];
        }
        return holidays
            .map((entry) => (entry as { date?: unknown } | null)?.date)
            .filter((date): date is string => typeof date === 'string');
    } catch (err) {
        logger.error({ err }, 'Holiday lookup failed — treating today as a trading day');
        return [];
    }
}

/**
 * True when `now` falls on one of `holidays`, in the exchange's own timezone.
 * The read is the caller's, so this stays a pure comparison — which is the only
 * reason it can be named `is`.
 */
export function isHoliday(holidays: readonly string[], now: Date = new Date()): boolean {
    return holidays.includes(NY_DATE.format(now));
}
