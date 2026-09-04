/** market-bars — OHLCV series reads, one collection per timeframe. */
import type { ChartTimeframe, OhlcvDoc } from '@ereuna/shared';
import { OHLCV_COLLECTIONS, isIntraday } from '@ereuna/shared';
import { marketKey, withCache } from '@/lib/cache.js';
import { getDb } from '@/lib/db.js';

type Candle = {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
};

type VolumePoint = {
    time: string;
    value: number;
};

export type BarSeries = {
    candles: Candle[];
    volume: VolumePoint[];
};

const PAGE_SIZE: Record<ChartTimeframe, number> = {
    daily: 1250,
    weekly: 260,
    intraday1m: 2000,
    intraday5m: 2000,
    intraday15m: 2000,
    intraday30m: 2000,
    intraday1hr: 2000,
};

/**
 * One page of bars, oldest first.
 * `before` is a cursor, not a filter: the query takes the newest bars strictly
 * older than it and reverses them, so paging back never re-reads a page or
 * skips a bar the way an offset does when the ingestor writes mid-scroll.
 */
export async function barSeries(
    symbol: string,
    timeframe: ChartTimeframe,
    options: { before?: Date } = {},
): Promise<BarSeries> {
    const { before } = options;

    const bars = await withCache(
        marketKey('bars', symbol, timeframe, before?.toISOString() ?? 'latest'),
        async () => {
            const filter = {
                tickerID: symbol,
                ...(before !== undefined ? { timestamp: { $lt: before } } : {}),
            };

            // The collection name comes from a compile-time map keyed by a
            // validated enum — request input never reaches `db.collection()`.
            const docs = await getDb()
                .collection<OhlcvDoc>(OHLCV_COLLECTIONS[timeframe])
                .find(filter)
                .sort({ timestamp: -1 })
                .limit(PAGE_SIZE[timeframe])
                .toArray();

            return docs.reverse();
        },
        { dataType: 'price' },
    );

    const formatTime = (timestamp: Date | string): string => {
        const iso = new Date(timestamp).toISOString();
        return isIntraday(timeframe) ? iso.slice(0, 19) : iso.slice(0, 10);
    };

    return {
        candles: bars.map((bar) => ({
            time: formatTime(bar.timestamp),
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
        })),
        volume: bars.map((bar) => ({ time: formatTime(bar.timestamp), value: bar.volume })),
    };
}
