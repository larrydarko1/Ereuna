/**
 * Where the simulated market starts: each symbol's last real daily bar, so a
 * chart picks up from yesterday's close and the busiest names trade the most.
 * One read for the whole universe rather than one per symbol. The window is two
 * weeks so a long weekend, a holiday or a nightly run that failed still finds a
 * bar, while the index on `(tickerID, timestamp)` keeps it to a handful of bars
 * per symbol.
 */
import { OHLCV_COLLECTIONS, type OhlcvDoc } from '@ereuna/shared';

import { getDb } from '@/lib/db.js';
import { type LastBar } from '@/simulator/traffic.js';

const LOOKBACK_MS = 14 * 86_400_000;

export async function listLastBars(symbols: readonly string[], now: Date): Promise<LastBar[]> {
    if (symbols.length === 0) return [];

    const bars = await getDb()
        .collection<OhlcvDoc>(OHLCV_COLLECTIONS.daily)
        .find<Pick<OhlcvDoc, 'tickerID' | 'timestamp' | 'close' | 'volume'>>(
            { tickerID: { $in: [...symbols] }, timestamp: { $gte: new Date(now.getTime() - LOOKBACK_MS) } },
            { projection: { _id: 0, tickerID: 1, timestamp: 1, close: 1, volume: 1 } },
        )
        .toArray();

    const latest = new Map<string, (typeof bars)[number]>();
    for (const bar of bars) {
        const seen = latest.get(bar.tickerID);
        if (seen === undefined || bar.timestamp > seen.timestamp) latest.set(bar.tickerID, bar);
    }

    return [...latest.values()].map((bar) => ({ symbol: bar.tickerID, close: bar.close, volume: bar.volume }));
}
