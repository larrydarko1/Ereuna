/** Intraday retention. */
import { INTRADAY_COLLECTIONS, type OhlcvDoc } from '@ereuna/shared';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';

export async function pruneIntraday(now = Date.now()): Promise<number> {
    const cutoff = new Date(now - config.organize.intradayRetentionDays * 86_400_000);
    let removed = 0;

    for (const collection of INTRADAY_COLLECTIONS) {
        // eslint-disable-next-line contracts/no-db-await-in-loop -- one deleteMany per intraday collection; no query spans collections, so six is the minimum
        const result = await getDb()
            .collection<OhlcvDoc>(collection)
            .deleteMany({ timestamp: { $lt: cutoff } });
        removed += result.deletedCount;
        logger.debug({ collection, removed: result.deletedCount }, 'Intraday bars pruned');
    }

    logger.info({ removed, cutoff: cutoff.toISOString() }, 'Intraday retention applied');
    return removed;
}
