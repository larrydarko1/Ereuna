/** The daily bar update: one whole-market call, plus the sessions the store is missing. */
import type { OhlcvDoc } from '@ereuna/shared';
import { sessionClose } from '@ereuna/shared';

import { insertMissingBars, replaceBars } from '@/lib/candle-store.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { dailyHistory, marketPrices, type VendorDailyBar } from '@/lib/tiingo.js';
import { chunk, type Asset } from '@/organize/universe.js';
import { listSessions } from '@/utils/holidays.js';

export type PriceUpdate = {
    written: number;
    /** The earliest session written, so the weeks from there on are rebuilt; null when nothing was. */
    since: Date | null;
    splits: { symbol: string; at: Date; factor: number }[];
    dividends: { symbol: string; at: Date; amount: number }[];
};

/** A usable vendor row: the bar to store, and the corporate actions it carries. */
type PricedBar = { bar: OhlcvDoc; splitFactor: number; divCash: number };

const DAY = 86_400_000;

/**
 * Fetch and store the latest session's bar for every symbol in the universe,
 * and every recent session a symbol has no bar for.
 * The whole-market call only ever returns the latest session, so a night the
 * run missed would otherwise stay a hole for good; those come from the
 * per-symbol endpoint, one request per symbol with a hole.
 * Replaced rather than inserted: the aggregator already wrote a daily bar at
 * the bell out of the IEX prints alone, and the vendor's consolidated bar is
 * the one to keep. Splits and dividends are returned rather than applied:
 * applying a split rewrites a symbol's whole history, and that belongs to the
 * caller's ordering, not to the middle of a batch.
 */
export async function updateDailyPrices(universe: readonly Asset[]): Promise<PriceUpdate> {
    const symbols = new Set(universe.map((asset) => asset.symbol.toUpperCase()));

    const tonight = (await marketPrices()).flatMap((row) => {
        const symbol = row.ticker.toUpperCase();
        if (!symbols.has(symbol)) return [];
        const priced = toPriced(symbol, row);
        return priced === null ? [] : [priced];
    });
    const filled = await fetchMissingSessions(symbols, tonight);
    const priced = [...filled, ...tonight];

    const bars = priced.map(({ bar }) => bar);
    for (const batch of chunk(bars, config.organize.writeBatchSize)) {
        await replaceBars('OHCLVData', batch);
        await insertMissingBars('OHCLVData1m', batch.map(closingMinute));
    }

    const result = summarise(priced);
    logger.info({ ...counts(result), filled: filled.length }, 'Daily prices updated');
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
 * The bars for every session in the lookback window that a symbol has neither
 * stored nor in tonight's bars, up to the latest session tonight's bars carry.
 * With no bars tonight there is no latest session to measure from, and the
 * next run finds the same holes.
 */
async function fetchMissingSessions(symbols: ReadonlySet<string>, tonight: readonly PricedBar[]): Promise<PricedBar[]> {
    const latest = tonight.reduce((max, { bar }) => Math.max(max, bar.timestamp.getTime()), Number.NEGATIVE_INFINITY);
    if (!Number.isFinite(latest)) return [];

    const from = new Date(latest - config.organize.gapLookbackDays * DAY);
    const sessions = listSessions(from, new Date(latest));
    const held = await storedSessions(from, new Date(latest));
    for (const { bar } of tonight) sessionsOf(held, bar.tickerID).add(bar.timestamp.getTime());

    const holes = [...symbols].flatMap((symbol) => {
        const have = sessionsOf(held, symbol);
        const missing = sessions.filter((session) => !have.has(session.getTime()));
        return missing.length === 0 ? [] : [{ symbol, missing }];
    });

    const filled = await Promise.all(holes.map(({ symbol, missing }) => fetchSessions(symbol, missing)));
    return filled.flat();
}

/**
 * One symbol's bars for `missing`, from the per-symbol endpoint.
 * A failed request is logged and left: the hole it was for is found again by
 * the next run, and one symbol's vendor error must not cost the others theirs.
 */
async function fetchSessions(symbol: string, missing: readonly Date[]): Promise<PricedBar[]> {
    const wanted = new Set(missing.map((session) => session.getTime()));
    const [first] = missing;
    if (first === undefined) return [];

    try {
        const rows = await dailyHistory(symbol, first.toISOString().slice(0, 10));
        return rows.flatMap((row) => {
            const priced = toPriced(symbol, row);
            return priced !== null && wanted.has(priced.bar.timestamp.getTime()) ? [priced] : [];
        });
    } catch (err) {
        logger.warn({ err, symbol, missing: missing.length }, 'Missing sessions could not be fetched');
        return [];
    }
}

/** Every session each symbol has a daily bar for between `from` and `through`. */
async function storedSessions(from: Date, through: Date): Promise<Map<string, Set<number>>> {
    const rows = await getDb()
        .collection<OhlcvDoc>('OHCLVData')
        .aggregate<{ _id: string; sessions: Date[] }>([
            { $match: { timestamp: { $gte: from, $lte: through } } },
            { $group: { _id: '$tickerID', sessions: { $addToSet: '$timestamp' } } },
        ])
        .toArray();

    return new Map(rows.map((row) => [row._id, new Set(row.sessions.map((session) => session.getTime()))]));
}

function sessionsOf(held: Map<string, Set<number>>, symbol: string): Set<number> {
    const existing = held.get(symbol);
    if (existing !== undefined) return existing;
    const created = new Set<number>();
    held.set(symbol, created);
    return created;
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

function toPriced(symbol: string, row: VendorDailyBar): PricedBar | null {
    const bar = toBar(symbol, row);
    return bar === null ? null : { bar, splitFactor: row.splitFactor, divCash: row.divCash };
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

function summarise(priced: readonly PricedBar[]): PriceUpdate {
    const result: PriceUpdate = { written: priced.length, since: null, splits: [], dividends: [] };

    for (const { bar, splitFactor, divCash } of priced) {
        if (result.since === null || bar.timestamp < result.since) result.since = bar.timestamp;
        if (splitFactor !== 1 && Number.isFinite(splitFactor)) {
            result.splits.push({ symbol: bar.tickerID, at: bar.timestamp, factor: splitFactor });
        }
        if (divCash !== 0 && Number.isFinite(divCash)) {
            result.dividends.push({ symbol: bar.tickerID, at: bar.timestamp, amount: divCash });
        }
    }

    return result;
}

function counts(result: PriceUpdate): Record<string, number> {
    return { written: result.written, splits: result.splits.length, dividends: result.dividends.length };
}
