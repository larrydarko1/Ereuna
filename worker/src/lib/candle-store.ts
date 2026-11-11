/**
 * Writing bars into the seven candle collections.
 * They are MongoDB time series, and the server refuses to change a stored bar:
 * no upsert, no updateOne, no `$set` on a price (checked on 8.3 and 9.0). It
 * does allow inserts, and deletes filtered on `tickerID` and `timestamp`, so
 * replacing a bar is a delete followed by an insert.
 * Not atomic: time series refuse multi-document transactions too, so a crash
 * between the two leaves the bar missing until something writes it again.
 */
import type { OhlcvDoc } from '@ereuna/shared';

import { getDb } from '@/lib/db.js';

/**
 * Store each bar, replacing any stored one with the same (tickerID, timestamp).
 * A bar repeated within the batch keeps its last copy. One delete per distinct
 * timestamp: a batch is nearly always one boundary closing for the whole
 * universe, so that is usually a single round trip.
 */
export async function replaceBars(collection: string, bars: readonly OhlcvDoc[]): Promise<void> {
    if (bars.length === 0) return;

    const latest = [...new Map(bars.map((bar) => [barKey(bar), bar])).values()];
    const target = getDb().collection<OhlcvDoc>(collection);

    await Promise.all(
        [...symbolsByTime(latest)].map(([time, symbols]) =>
            target.deleteMany({ timestamp: new Date(time), tickerID: { $in: symbols } }),
        ),
    );
    // Unordered: one rejected bar must not abandon the rest of the batch
    await target.insertMany(latest, { ordered: false });
}

/** Store only the bars whose (tickerID, timestamp) is not stored yet, and say how many that was. */
export async function insertMissingBars(collection: string, bars: readonly OhlcvDoc[]): Promise<number> {
    if (bars.length === 0) return 0;

    const target = getDb().collection<OhlcvDoc>(collection);
    const stored = await target
        .find(
            {
                $or: [...symbolsByTime(bars)].map(([time, symbols]) => ({
                    timestamp: new Date(time),
                    tickerID: { $in: symbols },
                })),
            },
            { projection: { _id: 0, tickerID: 1, timestamp: 1 } },
        )
        .toArray();

    const present = new Set(stored.map(barKey));
    const missing = bars.filter((bar) => !present.has(barKey(bar)));
    if (missing.length === 0) return 0;

    await target.insertMany(missing, { ordered: false });
    return missing.length;
}

function barKey(bar: Pick<OhlcvDoc, 'tickerID' | 'timestamp'>): string {
    return `${bar.tickerID}@${String(bar.timestamp.getTime())}`;
}

function symbolsByTime(bars: readonly OhlcvDoc[]): Map<number, string[]> {
    const grouped = new Map<number, string[]>();
    for (const bar of bars) {
        const time = bar.timestamp.getTime();
        const symbols = grouped.get(time);
        if (symbols === undefined) grouped.set(time, [bar.tickerID]);
        else symbols.push(bar.tickerID);
    }
    return grouped;
}
