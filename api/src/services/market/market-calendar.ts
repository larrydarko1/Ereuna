/**
 * market-calendar — the corporate-events calendar for a single day.
 * The ingested `Calendar` collection mixes earnings, dividends and splits in
 * one series; they are read together and split by type on the way out, because
 * a day's calendar is one query and three lists, not three queries.
 */
import type { CalendarEventDoc, CalendarEventType } from '@ereuna/shared';
import { marketKey, withCache } from '@/lib/cache.js';
import { getDb } from '@/lib/db.js';

type CalendarEvent = {
    symbol: string;
    type: CalendarEventType;
    reportDate: string; // ISO 8601
    details: Record<string, unknown>; // Whatever the ingestor attached for this event type
};

export type DayCalendar = {
    date: string;
    earnings: CalendarEvent[];
    dividends: CalendarEvent[];
    splits: CalendarEvent[];
};

const MAX_EVENTS = 2000;

/** Every event dated on `day`, measured in UTC, grouped by type. */
export async function dayCalendar(day: Date): Promise<DayCalendar> {
    const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const date = start.toISOString().slice(0, 10);

    return withCache(
        marketKey('calendar', date),
        async () => {
            const docs = await getDb()
                .collection<CalendarEventDoc>('Calendar')
                .find({ reportDate: { $gte: start, $lt: end } })
                .sort({ type: 1, symbol: 1 })
                .limit(MAX_EVENTS)
                .toArray();

            const events = docs.map(toEvent);
            return {
                date,
                earnings: events.filter((event) => event.type === 'Earnings'),
                dividends: events.filter((event) => event.type === 'Dividend'),
                splits: events.filter((event) => event.type === 'Split'),
            };
        },
        { dataType: 'price' },
    );
}

function toEvent(doc: CalendarEventDoc): CalendarEvent {
    const { _id, symbol, type, reportDate, ...details } = doc as CalendarEventDoc & { _id: unknown };
    return {
        symbol,
        type,
        reportDate: new Date(reportDate).toISOString(),
        details,
    };
}
