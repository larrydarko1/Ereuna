/** The daily bar update: one whole-market call, upserted. */
import type { AnyBulkWriteOperation } from 'mongodb';
import type { OhlcvDoc } from '@ereuna/shared';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { marketPrices, type VendorDailyBar, type VendorMarketBar } from '@/lib/tiingo.js';
import { chunk, type Asset } from '@/organize/universe.js';

/** The minute the synthetic closing bar is stamped with: 16:00 New York, in UTC. */
const CLOSING_MINUTE_UTC = 20;

export type PriceUpdate = {
    written: number;
    splits: { symbol: string; at: Date; factor: number }[];
    dividends: { symbol: string; at: Date; amount: number }[];
};

/**
 * Fetch and store the latest session's bar for every symbol in the universe.
 * Splits and dividends are returned rather than applied: applying a split
 * rewrites a symbol's whole history, and that belongs to the caller's ordering,
 * not to the middle of a bulk upsert.
 */
export async function updateDailyPrices(universe: readonly Asset[]): Promise<PriceUpdate> {
    const wanted = new Map(universe.map((asset) => [asset.symbol.toUpperCase(), asset]));
    const rows = await marketPrices();

    const bars: AnyBulkWriteOperation<OhlcvDoc>[] = [];
    const closes: AnyBulkWriteOperation<OhlcvDoc>[] = [];
    const result: PriceUpdate = { written: 0, splits: [], dividends: [] };

    for (const row of rows) {
        const symbol = row.ticker?.toUpperCase();
        if (symbol === undefined || !wanted.has(symbol)) continue;

        const bar = toBar(symbol, row);
        if (bar === null) continue;

        bars.push({
            updateOne: {
                filter: { tickerID: bar.tickerID, timestamp: bar.timestamp },
                update: { $set: bar },
                upsert: true,
            },
        });
        closes.push(closingMinute(bar));
        result.written += 1;

        if (row.splitFactor !== 1 && Number.isFinite(row.splitFactor)) {
            result.splits.push({ symbol, at: bar.timestamp, factor: row.splitFactor });
        }
        if (row.divCash !== 0 && Number.isFinite(row.divCash)) {
            result.dividends.push({ symbol, at: bar.timestamp, amount: row.divCash });
        }
    }

    await upsertBars('OHCLVData', bars);
    await upsertBars('OHCLVData1m', closes);
    logger.info({ ...counts(result) }, 'Daily prices updated');
    return result;
}

/**
 * Replace one symbol's entire daily and weekly history from the vendor.
 * Run after a split, when every historical bar has a new adjusted price and
 * patching them individually would be slower and less correct than refetching.
 */
export async function refetchHistory(symbol: string, history: readonly VendorDailyBar[]): Promise<number> {
    const bars = history.flatMap((row) => {
        const bar = toBar(symbol, row);
        return bar === null ? [] : [bar];
    });
    if (bars.length === 0) return 0;

    const db = getDb();
    await db.collection<OhlcvDoc>('OHCLVData').deleteMany({ tickerID: symbol });
    for (const batch of chunk(bars, config.organize.writeBatchSize)) {
        await db.collection<OhlcvDoc>('OHCLVData').insertMany(batch, { ordered: false });
    }

    return bars.length;
}

/**
 * The synthetic 1-minute bar at the closing minute.
 * It exists so a symbol that never printed during the session still has a
 * final intraday bar. `$setOnInsert`, not `$set`: on a symbol that did trade,
 * the aggregator has already written a real bar for that minute out of real
 * prints, and overwriting it with a flat one carrying zero volume would throw
 * that away
 */
function closingMinute(bar: OhlcvDoc): AnyBulkWriteOperation<OhlcvDoc> {
    const timestamp = new Date(bar.timestamp);
    timestamp.setUTCHours(CLOSING_MINUTE_UTC, 0, 0, 0);

    return {
        updateOne: {
            filter: { tickerID: bar.tickerID, timestamp },
            update: {
                $setOnInsert: {
                    tickerID: bar.tickerID,
                    timestamp,
                    open: bar.close,
                    high: bar.close,
                    low: bar.close,
                    close: bar.close,
                    volume: 0,
                },
            },
            upsert: true,
        },
    };
}

/**
 * One vendor row as a stored bar, or null when it is not usable.
 * The adjusted fields are the ones kept; a row missing any of them is dropped
 * rather than half-filled, because a bar with a raw close among adjusted ones
 * is a discontinuity that every derived figure would then read as a move.
 */
function toBar(symbol: string, row: VendorDailyBar): OhlcvDoc | null {
    const timestamp = new Date(row.date);
    if (Number.isNaN(timestamp.getTime())) return null;

    const open = row.adjOpen;
    const high = row.adjHigh;
    const low = row.adjLow;
    const close = row.adjClose;
    const volume = row.adjVolume;
    if (![open, high, low, close, volume].every((value) => typeof value === 'number' && Number.isFinite(value))) return null;

    // The daily series is keyed by date; the vendor's midnight stamp is the date
    timestamp.setUTCHours(0, 0, 0, 0);
    return { tickerID: symbol, timestamp, open, high, low, close, volume };
}

async function upsertBars(collection: string, operations: readonly AnyBulkWriteOperation<OhlcvDoc>[]): Promise<void> {
    if (operations.length === 0) return;

    for (const batch of chunk(operations, config.organize.writeBatchSize)) {
        try {
            await getDb().collection<OhlcvDoc>(collection).bulkWrite(batch, { ordered: false });
        } catch (err) {
            logger.error({ err, collection, count: batch.length }, 'Bar bulk write failed');
        }
    }
}

function counts(result: PriceUpdate): Record<string, number> {
    return { written: result.written, splits: result.splits.length, dividends: result.dividends.length };
}
