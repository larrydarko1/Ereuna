/** Marking symbols that have stopped printing. */
import type { OhlcvDoc } from '@ereuna/shared';

import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import type { Asset } from '@/organize/universe.js';
import { setOn, writeAssetInfo } from '@/organize/write.js';

/**
 * Flag every symbol with no daily bar since the cutoff, and return them.
 * Refuses, writing nothing, when the scan would retire more than
 * `maxDelistShare` of the universe: the vendor publishes no delisting events,
 * so a missing bar is the only evidence, and weeks of failed price updates
 * look exactly like the whole market delisting at once.
 */
export async function markDelisted(universe: readonly Asset[]): Promise<string[]> {
    const cutoff = new Date(Date.now() - config.organize.delistAfterDays * 86_400_000);

    const active = await getDb()
        .collection<OhlcvDoc>('OHCLVData')
        .aggregate<{ _id: string; latest: Date }>(
            [
                { $group: { _id: '$tickerID', latest: { $max: '$timestamp' } } },
                { $match: { latest: { $gte: cutoff } } },
            ],
            { allowDiskUse: true },
        )
        .toArray();

    const trading = new Set(active.map((row) => row._id));
    const delisted = universe.filter((asset) => !trading.has(asset.symbol)).map((asset) => asset.symbol);

    const ceiling = Math.floor(universe.length * config.organize.maxDelistShare);
    if (delisted.length > ceiling) {
        throw new Error(
            `Delisting scan refused: ${delisted.length} of ${universe.length} symbols have no bar since ${cutoff.toISOString()}, above the ceiling of ${ceiling}`,
        );
    }

    await writeAssetInfo(
        delisted.map((symbol) => setOn(symbol, { Delisted: true, RSScore1W: null, RSScore1M: null, RSScore4M: null })),
    );

    logger.info({ delisted: delisted.length, cutoff: cutoff.toISOString() }, 'Delisting scan complete');
    return delisted;
}

export function stillListed(universe: readonly Asset[], delisted: readonly string[]): Asset[] {
    const gone = new Set(delisted);
    return universe.filter((asset) => !gone.has(asset.symbol));
}
