/** The daily bar update: one whole-market call, replacing what the bell wrote. */
import type { OhlcvDoc } from '@ereuna/shared';
import { sessionClose } from '@ereuna/shared';

import { insertMissingBars, replaceBars } from '@/lib/candle-store.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { marketPrices, type VendorDailyBar } from '@/lib/tiingo.js';
import { chunk, type Asset } from '@/organize/universe.js';

export type PriceUpdate = {
    written: number;
    splits: { symbol: string; at: Date; factor: number }[];
    dividends: { symbol: string; at: Date; amount: number }[];
};

/**
 * Fetch and store the latest session's bar for every symbol in the universe.
 * Replaced rather than inserted: the aggregator already wrote a daily bar at
 * the bell out of the IEX prints alone, and the vendor's consolidated bar is
 * the one to keep. Splits and dividends are returned rather than applied:
 * applying a split rewrites a symbol's whole history, and that belongs to the
 * caller's ordering, not to the middle of a batch.
 */
export async function updateDailyPrices(universe: readonly Asset[]): Promise<PriceUpdate> {
    const wanted = new Map(universe.map((asset) => [asset.symbol.toUpperCase(), asset]));
    const rows = await marketPrices();

    const bars: OhlcvDoc[] = [];
    const result: PriceUpdate = { written: 0, splits: [], dividends: [] };

    for (const row of rows) {
        const symbol = row.ticker.toUpperCase();
        if (!wanted.has(symbol)) continue;

        const bar = toBar(symbol, row);
        if (bar === null) continue;

        bars.push(bar);
        result.written += 1;

        if (row.splitFactor !== 1 && Number.isFinite(row.splitFactor)) {
            result.splits.push({ symbol, at: bar.timestamp, factor: row.splitFactor });
        }
        if (row.divCash !== 0 && Number.isFinite(row.divCash)) {
            result.dividends.push({ symbol, at: bar.timestamp, amount: row.divCash });
        }
    }

    for (const batch of chunk(bars, config.organize.writeBatchSize)) {
        await replaceBars('OHCLVData', batch);
        await insertMissingBars('OHCLVData1m', batch.map(closingMinute));
    }

    logger.info({ ...counts(result) }, 'Daily prices updated');
    return result;
}

/**
 * Replace one symbol's entire daily history from the vendor.
 * Run after a split, when every historical bar has a new adjusted price and
 * patching them individually would be slower and less correct than refetching.
 * The weekly bars are derived from these, so the caller rebuilds them after.
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
        // eslint-disable-next-line contracts/no-db-await-in-loop -- one insert per batch of bars, not per bar, and sequential so a whole universe does not swamp the pool
        await db.collection<OhlcvDoc>('OHCLVData').insertMany(batch, { ordered: false });
    }

    return bars.length;
}

/**
 * The synthetic 1-minute bar at the closing minute.
 * It exists so a symbol that never printed during the session still has a
 * final intraday bar. Written only where no bar is stored: on a symbol that
 * did trade, the aggregator has already written a real bar for that minute out
 * of real prints, and replacing it with a flat one carrying zero volume would
 * throw that away
 */
function closingMinute(bar: OhlcvDoc): OhlcvDoc {
    return {
        tickerID: bar.tickerID,
        timestamp: sessionClose(bar.timestamp),
        open: bar.close,
        high: bar.close,
        low: bar.close,
        close: bar.close,
        volume: 0,
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
    if (![open, high, low, close, volume].every((value) => typeof value === 'number' && Number.isFinite(value)))
        return null;

    // The daily series is keyed by date; the vendor's midnight stamp is the date
    timestamp.setUTCHours(0, 0, 0, 0);
    return { tickerID: symbol, timestamp, open, high, low, close, volume };
}

function counts(result: PriceUpdate): Record<string, number> {
    return { written: result.written, splits: result.splits.length, dividends: result.dividends.length };
}
