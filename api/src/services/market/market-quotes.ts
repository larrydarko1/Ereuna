/**
 * market-quotes — latest and previous closes: the daily bar collection, with
 * today's bar taken from the aggregator while the stored copy has yet to land.
 */
import { z } from 'zod';

import type { OhlcvDoc, Quote } from '@ereuna/shared';

import { marketKey, withCache } from '@/lib/cache.js';
import { sha256 } from '@/lib/crypto.js';
import { getDb } from '@/lib/db.js';
import { readLastCandle } from '@/lib/last-bucket.js';

/** A daily close as the quote reads it; the timestamp is the bar's UTC day, as an ISO string. */
type Bar = { close: number; timestamp: string };

/** Each symbol's two newest stored bars, newest first: what the cache holds. */
const storedBarsSchema = z.array(
    z.object({ symbol: z.string(), bars: z.array(z.object({ close: z.number(), timestamp: z.string() })) }),
);

/**
 * Symbols per aggregation. The pipeline sorts before grouping, so an unbounded
 * `$in` is an unbounded sort — batching keeps each one inside the server's
 * memory limit no matter how large a watchlist or portfolio gets.
 */
const BATCH_SIZE = 500;

/**
 * The latest close for each symbol, as a map; with `before`, the latest bar
 * stamped earlier than it, which is how the live feed finds the previous
 * session's close whether or not today's bar has been written yet.
 * One aggregation per batch rather than one query per symbol: the old version
 * looped `find().sort().limit(1)` per ticker, so a 200-symbol watchlist cost
 * 200 round trips.
 */
export async function latestCloses(
    symbols: readonly string[],
    options: { before?: Date } = {},
): Promise<Map<string, number>> {
    const closes = new Map<string, number>();
    if (symbols.length === 0) return closes;

    const window = options.before === undefined ? {} : { timestamp: { $lt: options.before } };

    for (const batch of chunk(symbols, BATCH_SIZE)) {
        // eslint-disable-next-line contracts/no-db-await-in-loop -- one aggregation per batch of symbols; the per-symbol version above is the bug this replaced
        const docs = await getDb()
            .collection<OhlcvDoc>('OHCLVData')
            .aggregate<{ _id: string; close: number }>([
                { $match: { tickerID: { $in: batch }, ...window } },
                { $sort: { timestamp: -1 } },
                { $group: { _id: '$tickerID', close: { $first: '$close' } } },
            ])
            .toArray();

        for (const doc of docs) closes.set(doc._id, doc.close);
    }

    return closes;
}

/**
 * Latest close plus the day-over-day change for each symbol, as a vendor's
 * snapshot gives it: today's bar while the session builds it, the stored one
 * otherwise. The aggregator stores a daily bar only at the bell, so without
 * the live one a quote read during the session, or in the moment between the
 * bell and the write, is yesterday's close.
 */
export async function quotes(symbols: readonly string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];

    const [stored, today] = await Promise.all([readStoredBars(symbols), readTodaysBars(symbols)]);
    const bySymbol = new Map(stored.map((entry) => [entry.symbol, entry.bars]));
    // A listing with no stored history yet still has a price once it trades
    for (const symbol of today.keys()) {
        if (!bySymbol.has(symbol)) bySymbol.set(symbol, []);
    }

    return [...bySymbol].map(([symbol, bars]) => toQuote(symbol, withTodaysBar(bars, today.get(symbol))));
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

/**
 * The percentage move from `previous` to `latest`, to two places; null with no
 * usable reference, since a change of zero would be a claim the data does not
 * support. The REST quote and the live feed both use it, so a row reads the
 * same whichever of the two last filled it.
 */
export function percentChange(latest: number, previous: number | undefined): number | null {
    if (previous === undefined || previous === 0) return null;
    return round2(((latest - previous) / previous) * 100);
}

/**
 * The two newest stored bars per symbol. `$push`-then-`$slice` takes them in a
 * single pass, so the previous close costs no extra query.
 */
async function readStoredBars(symbols: readonly string[]): Promise<{ symbol: string; bars: Bar[] }[]> {
    // The key is a hash of the sorted symbol set, not the set itself: a
    // 500-symbol watchlist would otherwise produce a multi-kilobyte Redis key,
    // and sorting makes two callers requesting the same symbols share one entry.
    return withCache(
        marketKey('quotes', sha256([...symbols].sort().join(','))),
        storedBarsSchema,
        async () => {
            const results: { symbol: string; bars: Bar[] }[] = [];

            for (const batch of chunk(symbols, BATCH_SIZE)) {
                // eslint-disable-next-line contracts/no-db-await-in-loop -- one aggregation per batch of symbols, not per symbol
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

                for (const doc of docs) {
                    const bars = doc.bars.map((bar) => ({ close: bar.close, timestamp: bar.timestamp.toISOString() }));
                    results.push({ symbol: doc._id, bars });
                }
            }

            return results;
        },
        { dataType: 'price' },
    );
}

/** Today's bar of each symbol that has traded today, from the aggregator's last daily bucket. */
async function readTodaysBars(symbols: readonly string[]): Promise<Map<string, Bar>> {
    const buckets = await Promise.all(symbols.map((symbol) => readLastCandle(symbol, '1d')));
    const bars = new Map<string, Bar>();
    for (const bucket of buckets) {
        if (bucket !== null) bars.set(bucket.tickerID, { close: bucket.close, timestamp: bucket.timestamp });
    }
    return bars;
}

/** Today's bar in front of the stored ones, which may already hold a copy of it: the bell writes one. */
function withTodaysBar(bars: Bar[], today: Bar | undefined): Bar[] {
    if (today === undefined) return bars;
    return [today, ...bars.filter((bar) => Date.parse(bar.timestamp) < Date.parse(today.timestamp))];
}

function toQuote(symbol: string, bars: Bar[]): Quote {
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

    const changePercent = percentChange(latest.close, previous?.close);
    if (previous === undefined || changePercent === null) {
        return {
            symbol,
            close: latest.close,
            timestamp: latest.timestamp,
            previousClose: previous?.close ?? null,
            change: null,
            changePercent: null,
        };
    }

    const change = latest.close - previous.close;
    return {
        symbol,
        close: latest.close,
        timestamp: latest.timestamp,
        previousClose: previous.close,
        change: round2(change),
        changePercent,
    };
}

function chunk<T>(values: readonly T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < values.length; i += size) batches.push(values.slice(i, i + size));
    return batches;
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}
