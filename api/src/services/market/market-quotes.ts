/** market-quotes — latest and previous closes, read from the daily bar collection. */
import type { OhlcvDoc } from '@ereuna/shared';
import { marketKey, withCache } from '@/lib/cache.js';
import { sha256 } from '@/lib/crypto.js';
import { getDb } from '@/lib/db.js';

/**
 * Symbols per aggregation. The pipeline sorts before grouping, so an unbounded
 * `$in` is an unbounded sort — batching keeps each one inside the server's
 * memory limit no matter how large a watchlist or portfolio gets.
 */
const BATCH_SIZE = 500;

export type Quote = {
    symbol: string;
    close: number;
    timestamp: string;
    previousClose: number | null;
    change: number | null;
    changePercent: number | null;
};

/**
 * The latest close for each symbol, as a map.
 * One aggregation per batch rather than one query per symbol: the old version
 * looped `find().sort().limit(1)` per ticker, so a 200-symbol watchlist cost
 * 200 round trips.
 */
export async function latestCloses(symbols: readonly string[]): Promise<Map<string, number>> {
    const closes = new Map<string, number>();
    if (symbols.length === 0) return closes;

    for (const batch of chunk(symbols, BATCH_SIZE)) {
        const docs = await getDb()
            .collection<OhlcvDoc>('OHCLVData')
            .aggregate<{ _id: string; close: number }>([
                { $match: { tickerID: { $in: batch } } },
                { $sort: { timestamp: -1 } },
                { $group: { _id: '$tickerID', close: { $first: '$close' } } },
            ])
            .toArray();

        for (const doc of docs) closes.set(doc._id, doc.close);
    }

    return closes;
}

/**
 * Latest close plus the day-over-day change for each symbol.
 * `$push`-then-`$slice` takes the two most recent bars per symbol in a single
 * pass, so the previous close costs no extra query.
 */
export async function quotes(symbols: readonly string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];

    // The key is a hash of the sorted symbol set, not the set itself: a
    // 500-symbol watchlist would otherwise produce a multi-kilobyte Redis key,
    // and sorting makes two callers requesting the same symbols share one entry.
    return withCache(
        marketKey('quotes', sha256([...symbols].sort().join(','))),
        async () => {
            const results: Quote[] = [];

            for (const batch of chunk(symbols, BATCH_SIZE)) {
                const docs = await getDb()
                    .collection<OhlcvDoc>('OHCLVData')
                    .aggregate<{ _id: string; bars: { close: number; timestamp: Date }[] }>([
                        { $match: { tickerID: { $in: batch } } },
                        { $sort: { timestamp: -1 } },
                        {
                            $group: {
                                _id: '$tickerID',
                                bars: { $push: { close: '$close', timestamp: '$timestamp' } },
                            },
                        },
                        { $project: { bars: { $slice: ['$bars', 2] } } },
                    ])
                    .toArray();

                for (const doc of docs) results.push(toQuote(doc._id, doc.bars));
            }

            return results;
        },
        { dataType: 'price' },
    );
}

function toQuote(symbol: string, bars: { close: number; timestamp: Date }[]): Quote {
    const latest = bars[0];
    const previous = bars[1];

    if (latest === undefined) {
        return {
            symbol,
            close: 0,
            timestamp: new Date(0).toISOString(),
            previousClose: null,
            change: null,
            changePercent: null,
        };
    }

    // A symbol with one bar has no comparison to make. Reporting a change of
    // zero would be a claim the data does not support, so it stays null.
    if (previous === undefined || previous.close === 0) {
        return {
            symbol,
            close: latest.close,
            timestamp: new Date(latest.timestamp).toISOString(),
            previousClose: previous?.close ?? null,
            change: null,
            changePercent: null,
        };
    }

    const change = latest.close - previous.close;
    return {
        symbol,
        close: latest.close,
        timestamp: new Date(latest.timestamp).toISOString(),
        previousClose: previous.close,
        change: round2(change),
        changePercent: round2((change / previous.close) * 100),
    };
}

/**
 * The first close at or after `from`, used as a benchmark's inception price.
 * Returns null when the instrument has no bar in that range — a benchmark added
 * for a symbol the ingestor does not carry back that far has no return to show.
 */
export async function closeOnOrAfter(symbol: string, from: Date): Promise<number | null> {
    const bar = await getDb()
        .collection<OhlcvDoc>('OHCLVData')
        .findOne({ tickerID: symbol, timestamp: { $gte: from } }, { sort: { timestamp: 1 }, projection: { close: 1 } });
    return bar?.close ?? null;
}

function chunk<T>(values: readonly T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < values.length; i += size) batches.push(values.slice(i, i + size));
    return batches;
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}
