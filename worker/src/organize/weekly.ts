/** Weekly bars, rebuilt from the daily series. */
import type { Document } from 'mongodb';

import type { OhlcvDoc } from '@ereuna/shared';

import { bucketStart } from '@/aggregate/buckets.js';
import { replaceBars } from '@/lib/candle-store.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { chunk } from '@/organize/universe.js';

const WEEKLY_COLLECTION = 'OHCLVData2';

/** Group daily bars into weeks. `$dateTrunc` with a Monday start is the same rule as `bucketStart`. */
const WEEKLY_GROUP: Document = {
    $group: {
        _id: {
            tickerID: '$tickerID',
            week: { $dateTrunc: { date: '$timestamp', unit: 'week', startOfWeek: 'monday' } },
        },
        open: { $first: '$open' },
        high: { $max: '$high' },
        low: { $min: '$low' },
        close: { $last: '$close' },
        volume: { $sum: '$volume' },
    },
};

/**
 * Rebuild the bar for the week in progress, for the whole universe.
 * Replaced on (tickerID, timestamp) rather than inserted, so a second run in
 * the same week corrects the bar instead of duplicating it, and so does the
 * week-to-date bar the aggregator wrote at the bell.
 */
export async function updateCurrentWeek(now = Date.now()): Promise<number> {
    const weekStart = new Date(bucketStart('1w', now));
    const rows = await aggregateWeeks({ timestamp: { $gte: weekStart } });

    for (const batch of chunk(rows, config.organize.writeBatchSize)) {
        await replaceBars(WEEKLY_COLLECTION, batch);
    }

    logger.info({ weekStart: weekStart.toISOString(), bars: rows.length }, 'Weekly bars updated');
    return rows.length;
}

/** Rebuild every weekly bar for one symbol, after its daily history was replaced. */
export async function rebuildWeekly(symbol: string): Promise<number> {
    const rows = await aggregateWeeks({ tickerID: symbol });
    const weekly = getDb().collection<OhlcvDoc>(WEEKLY_COLLECTION);

    await weekly.deleteMany({ tickerID: symbol });
    for (const batch of chunk(rows, config.organize.writeBatchSize)) {
        await weekly.insertMany(batch, { ordered: false });
    }

    return rows.length;
}

async function aggregateWeeks(match: Document): Promise<OhlcvDoc[]> {
    const rows = await getDb()
        .collection<OhlcvDoc>('OHCLVData')
        .aggregate<{ _id: { tickerID: string; week: Date } } & Omit<OhlcvDoc, 'tickerID' | 'timestamp'>>(
            [{ $match: match }, { $sort: { tickerID: 1, timestamp: 1 } }, WEEKLY_GROUP],
            { allowDiskUse: true },
        )
        .toArray();

    return rows.map(({ _id, ...bar }) => ({ tickerID: _id.tickerID, timestamp: _id.week, ...bar }));
}
