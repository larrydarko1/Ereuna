/** The exchange holiday list, rebuilt each night. */
import type { StatsDoc } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { holidayCalendar } from '@/utils/holidays.js';

/** Rebuild the holiday list for this year and the next. */
export async function updateHolidays(now = new Date()): Promise<number> {
    const holidays = holidayCalendar(now.getUTCFullYear(), 2);

    await getDb()
        .collection<StatsDoc>('Stats')
        .updateOne({ _id: 'Holidays' }, { $set: { Holidays: holidays, updatedAt: now } }, { upsert: true });

    logger.info({ holidays: holidays.length }, 'Holiday calendar updated');
    return holidays.length;
}
