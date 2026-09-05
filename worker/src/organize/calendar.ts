/** The corporate-events calendar, and the exchange holiday list. */
import type { AnyBulkWriteOperation } from 'mongodb';
import type { AssetInfoDoc, CalendarEventDoc, StatsDoc } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { chunk } from '@/organize/universe.js';
import { holidayCalendar } from '@/utils/holidays.js';

/** How far back events are published. Beyond this the collection is history nobody browses. */
const WINDOW_YEARS = 2;

/** Rebuild the holiday list for this year and the next. */
export async function updateHolidays(now = new Date()): Promise<number> {
    const holidays = holidayCalendar(now.getUTCFullYear(), 2);

    await getDb()
        .collection<StatsDoc>('Stats')
        .updateOne({ _id: 'Holidays' }, { $set: { Holidays: holidays, updatedAt: now } }, { upsert: true });

    logger.info({ holidays: holidays.length }, 'Holiday calendar updated');
    return holidays.length;
}

/** Rebuild the events calendar from the reference data. */
export async function updateCalendar(now = new Date()): Promise<number> {
    const cutoff = new Date(now);
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - WINDOW_YEARS);

    const cursor = getDb()
        .collection<AssetInfoDoc>('AssetInfo')
        .find(
            { Delisted: { $ne: true } },
            { projection: { _id: 0, Symbol: 1, dividends: 1, splits: 1, quarterlyFinancials: 1 } },
        );

    const operations: AnyBulkWriteOperation<CalendarEventDoc>[] = [];
    for await (const doc of cursor) operations.push(...eventsFor(doc, cutoff).map(upsert));

    await write(operations);
    logger.info({ events: operations.length }, 'Calendar rebuilt');
    return operations.length;
}

function eventsFor(doc: AssetInfoDoc, cutoff: Date): CalendarEventDoc[] {
    const events: CalendarEventDoc[] = [];

    for (const dividend of doc.dividends ?? []) {
        const reportDate = within(dividend.date, cutoff);
        if (reportDate !== null)
            events.push({ symbol: doc.Symbol, type: 'Dividend', reportDate, amount: dividend.amount ?? null });
    }

    for (const split of doc.splits ?? []) {
        const reportDate = within(split.date, cutoff);
        if (reportDate !== null)
            events.push({ symbol: doc.Symbol, type: 'Split', reportDate, ratio: split.ratio ?? null });
    }

    for (const quarter of doc.quarterlyFinancials ?? []) {
        const reportDate = within(quarter.fiscalDateEnding, cutoff);
        if (reportDate !== null) {
            events.push({ symbol: doc.Symbol, type: 'Earnings', reportDate, reportedEPS: quarter.reportedEPS ?? null });
        }
    }

    return events;
}

/** A date inside the publishing window, normalised to midnight UTC. */
function within(value: unknown, cutoff: Date): Date | null {
    if (typeof value !== 'string' && !(value instanceof Date)) return null;

    const at = new Date(value);
    if (Number.isNaN(at.getTime()) || at < cutoff) return null;

    at.setUTCHours(0, 0, 0, 0);
    return at;
}

function upsert(event: CalendarEventDoc): AnyBulkWriteOperation<CalendarEventDoc> {
    return {
        updateOne: {
            filter: { reportDate: event.reportDate, type: event.type, symbol: event.symbol },
            update: { $set: event },
            upsert: true,
        },
    };
}

async function write(operations: readonly AnyBulkWriteOperation<CalendarEventDoc>[]): Promise<void> {
    if (operations.length === 0) return;

    for (const batch of chunk(operations, 500)) {
        try {
            // eslint-disable-next-line contracts/no-db-await-in-loop -- one round trip per batch of operations, not per item, and sequential so a whole universe does not swamp the pool
            await getDb().collection<CalendarEventDoc>('Calendar').bulkWrite(batch, { ordered: false });
        } catch (err) {
            logger.error({ err, count: batch.length }, 'Calendar bulk write failed');
        }
    }
}
