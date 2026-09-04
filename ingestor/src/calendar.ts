/**
 * When there is a session to ingest.
 * Regular hours come from the shared helper the API uses, so the two cannot
 * disagree about whether the market is open. Holidays are read from Mongo,
 * because that calendar is data the organizer maintains rather than a rule.
 * The holiday read fails open. A Mongo blip on a normal trading morning would
 * otherwise silence the feed for the whole session, which is a far worse
 * failure than ingesting a few hours of nothing on a closed holiday.
 */
import { isMarketHours, type StatsDoc } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';

const NY_DATE = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/** True when today is an exchange holiday, in the exchange's own timezone. */
export async function isHoliday(now: Date = new Date()): Promise<boolean> {
    const today = NY_DATE.format(now);

    try {
        const document = await getDb().collection<StatsDoc>('Stats').findOne({ _id: 'Holidays' });
        const holidays = document?.Holidays;
        if (!Array.isArray(holidays)) {
            logger.warn('No holiday calendar in Stats — treating today as a trading day');
            return false;
        }
        return holidays.some((entry) => (entry as { date?: unknown } | null)?.date === today);
    } catch (err) {
        logger.error({ err }, 'Holiday lookup failed — treating today as a trading day');
        return false;
    }
}

export { isMarketHours };
