/**
 * market-overview — the ingestor's singleton documents and the reference index.
 * Everything here is written by the Python ingestor and only read by the API,
 * so all of it is cached hard.
 * The market summary is translated into the MarketOverview contract before it
 * leaves (utils/market-overview.ts) rather than passed through. Passing the
 * raw document through only moved the ingestor's vocabulary into the browser,
 * where a renamed field showed up as a blank panel instead of a failing test.
 * The holiday calendar and the statements are reshaped the same way: a stored
 * document carries its `_id` and whatever else its writer put beside the figures,
 * and none of that is the client's.
 */
import { z } from 'zod';

import type { Financials, MarketHoliday, MarketOverview, Statement, StatsDoc } from '@ereuna/shared';
import { holidayCalendarSchema, numeric, STATEMENT_FIELDS } from '@ereuna/shared';

import { AppError } from '@/lib/app-error.js';
import { marketKey, withCache } from '@/lib/cache.js';
import { getDb } from '@/lib/db.js';
import { getAsset } from '@/services/market/market-assets.js';
import { toMarketOverview } from '@/utils/market-overview.js';

// `updatedAt` leaves Redis as a string and is turned back into the Date the document holds
const statsDocSchema: z.ZodType<StatsDoc | null> = z
    .object({ _id: z.string(), updatedAt: z.coerce.date().exactOptional() })
    .catchall(z.unknown())
    .nullable();

/** One day. Holidays change on the ingestor's schedule, not ours. */
const DAY_SECONDS = 86_400;

/**
 * The market summary the dashboard opens with, including when it was last
 * ingested — which is why there is no separate "last update" endpoint: the
 * timestamp belongs to the document it describes.
 */
export async function marketStats(): Promise<MarketOverview> {
    return toMarketOverview(await statsDocument('marketStats'));
}

export async function holidays(): Promise<MarketHoliday[]> {
    const doc = await statsDocument('Holidays');
    const parsed = holidayCalendarSchema.shape.holidays.safeParse(doc['Holidays'] ?? []);
    if (!parsed.success) throw new AppError(500, 'INTERNAL', 'The Holidays document does not hold a calendar');
    return parsed.data;
}

/**
 * Annual and quarterly financial statements for one symbol.
 * A symbol with no statements returns empty lists rather than a 404: the asset
 * exists, the ingestor simply has not covered it, and those are different
 * answers to the caller.
 */
export async function financials(symbol: string): Promise<Financials> {
    const asset = await getAsset(symbol);
    return {
        symbol,
        annual: (asset.AnnualFinancials ?? []).flatMap(toStatement),
        quarterly: (asset.quarterlyFinancials ?? []).flatMap(toStatement),
    };
}

async function statsDocument(id: string): Promise<StatsDoc> {
    // Holidays is a calendar, not a quote: it is cached for a day and under the static data type, where everything else here follows the price clock
    const isCalendar = id === 'Holidays';
    const doc = await withCache(
        marketKey('stats', id),
        statsDocSchema,
        async () => getDb().collection<StatsDoc>('Stats').findOne({ _id: id }),
        { ...(isCalendar ? { ttl: DAY_SECONDS } : {}), dataType: isCalendar ? 'static' : 'price' },
    );

    if (doc === null) throw new AppError(404, 'NOT_FOUND', `Stats document ${id} has not been ingested`);
    return doc;
}

/**
 * One stored period as the table reads it: its end date, and the named line
 * items as numbers or null. A period without a readable end date is dropped —
 * there is no column to put it in.
 */
function toStatement(row: Record<string, unknown>): Statement[] {
    const ending = row['fiscalDateEnding'];
    const date = ending instanceof Date || typeof ending === 'string' ? new Date(ending) : null;
    if (date === null || Number.isNaN(date.getTime())) return [];

    const figures: Statement['figures'] = {};
    for (const field of STATEMENT_FIELDS) {
        if (field in row) figures[field] = numeric(row[field]);
    }
    return [{ fiscalDateEnding: date.toISOString(), figures }];
}
