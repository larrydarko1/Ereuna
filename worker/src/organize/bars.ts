/**
 * Reading daily bars for a batch of symbols.
 * Every derived statistic in the run needs the same window of the same
 * collection, so it is read once per batch and handed to all of them.
 * Series come back in ASCENDING time order, which is the convention every
 * function in `utils/indicators` expects.
 */
import type { OhlcvDoc } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';

export type Series = {
    timestamps: Date[];
    opens: number[];
    highs: number[];
    lows: number[];
    closes: number[];
    volumes: number[];
};

/**
 * All-time extremes and the first and last bar of every symbol's full history.
 * Computed by the server over the whole collection, because these are the only
 * figures that need more than the recent window and materialising decades of
 * bars in the process to take a `Math.max` would be the one query that decides
 * how much memory the run needs.
 */
export type LifetimeStats = {
    high: number;
    low: number;
    firstClose: number;
    firstTimestamp: Date;
    lastClose: number;
    lastTimestamp: Date;
};

const DAILY_WINDOW = 400;

/**
 * The last `limit` daily bars for each symbol, ascending, keyed by symbol.
 * One aggregation for the whole batch: `$sort` walks the (tickerID, timestamp)
 * index backwards, `$group` keeps only what the window needs, and the reversal
 * back into ascending order happens here rather than in the pipeline.
 */
export async function dailySeries(symbols: readonly string[], limit = DAILY_WINDOW): Promise<Map<string, Series>> {
    const series = new Map<string, Series>();
    if (symbols.length === 0) return series;

    const rows = await getDb()
        .collection<OhlcvDoc>('OHCLVData')
        .aggregate<{ _id: string; bars: Omit<OhlcvDoc, 'tickerID'>[] }>([
            { $match: { tickerID: { $in: [...symbols] } } },
            { $sort: { tickerID: 1, timestamp: -1 } },
            {
                $group: {
                    _id: '$tickerID',
                    bars: {
                        $push: {
                            timestamp: '$timestamp',
                            open: '$open',
                            high: '$high',
                            low: '$low',
                            close: '$close',
                            volume: '$volume',
                        },
                    },
                },
            },
            { $project: { bars: { $slice: ['$bars', limit] } } },
        ])
        .toArray();

    for (const row of rows) series.set(row._id, toSeries(row.bars));
    return series;
}

export async function lifetimeStats(): Promise<Map<string, LifetimeStats>> {
    const rows = await getDb()
        .collection<OhlcvDoc>('OHCLVData')
        .aggregate<{ _id: string } & LifetimeStats>(
            [
                { $sort: { tickerID: 1, timestamp: 1 } },
                {
                    $group: {
                        _id: '$tickerID',
                        high: { $max: '$high' },
                        low: { $min: '$low' },
                        firstClose: { $first: '$close' },
                        firstTimestamp: { $first: '$timestamp' },
                        lastClose: { $last: '$close' },
                        lastTimestamp: { $last: '$timestamp' },
                    },
                },
            ],
            { allowDiskUse: true },
        )
        .toArray();

    const stats = new Map<string, LifetimeStats>();
    for (const { _id, ...rest } of rows) stats.set(_id, rest);
    return stats;
}

function toSeries(bars: readonly Omit<OhlcvDoc, 'tickerID'>[]): Series {
    const ascending = [...bars].reverse();

    return {
        timestamps: ascending.map((bar) => bar.timestamp),
        opens: ascending.map((bar) => bar.open),
        highs: ascending.map((bar) => bar.high),
        lows: ascending.map((bar) => bar.low),
        closes: ascending.map((bar) => bar.close),
        volumes: ascending.map((bar) => bar.volume),
    };
}
