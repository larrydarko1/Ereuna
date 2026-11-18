/**
 * Catching the daily store up after a restore from an old backup.
 *
 * The nightly looks back only two weeks for a missing session, so a database
 * restored from months ago would keep its gap for good. This asks the
 * per-symbol endpoint, once per symbol, for everything from that symbol's first
 * missing session, and writes it batch by batch so memory stays flat however
 * long the gap. A rerun works each gap out again from what is stored, so an
 * interrupted run loses only time.
 */
import type { OhlcvDoc } from '@ereuna/shared';

import { insertMissingBars } from '@/lib/candle-store.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { dailyHistory } from '@/lib/tiingo.js';
import { applyDividends, recordSplit } from '@/organize/corporate-actions.js';
import { closingMinute, refetchHistory, toPricedHistory, type PricedBar } from '@/organize/prices.js';
import { activeUniverse, chunk } from '@/organize/universe.js';
import { rebuildWeekly, updateWeeksFor } from '@/organize/weekly.js';
import { findFirstMissingSession } from '@/utils/holidays.js';
import { isSplit } from '@/utils/splits.js';

export type BackfillSummary = {
    symbols: number;
    current: number; // Nothing missing, so nothing asked
    filled: number;
    restated: number; // A split in the gap, so the whole history was refetched
    failed: number;
    written: number;
};

/** One symbol's missing stretch: the first session it lacks, and the bars the vendor sent from there. */
type Gap = { symbol: string; start: Date; priced: PricedBar[] };

type Outcome = { status: 'current' } | { status: 'failed' } | { status: 'gap'; gap: Gap };

const DAY = 86_400_000;
const SYMBOLS_PER_BATCH = 100;
/** How far back a missing session is looked for; a symbol with no bar in this window resumes after its last one. */
const LOOKBACK_DAYS = 366;
/** Where a symbol with no stored bar at all starts: the vendor's own default. */
const HISTORY_START = new Date('1960-01-01T00:00:00.000Z');

/**
 * Fill every active symbol's missing sessions up to yesterday. Today's bar is
 * left to the nightly, which runs after this. A symbol the vendor refuses is
 * counted and skipped, so one unknown ticker never stops the run.
 */
export async function backfill(now: Date): Promise<BackfillSummary> {
    const symbols = (await activeUniverse()).map((asset) => asset.symbol);
    const summary: BackfillSummary = {
        symbols: symbols.length,
        current: 0,
        filled: 0,
        restated: 0,
        failed: 0,
        written: 0,
    };
    const batches = chunk(symbols, SYMBOLS_PER_BATCH);

    for (const [index, batch] of batches.entries()) {
        const outcomes = await Promise.all(batch.map((symbol) => checkGap(symbol, now)));
        const gaps = outcomes.flatMap((outcome) => (outcome.status === 'gap' ? [outcome.gap] : []));
        summary.current += outcomes.filter((outcome) => outcome.status === 'current').length;
        summary.failed += outcomes.filter((outcome) => outcome.status === 'failed').length;

        const split = gaps.filter((gap) => gap.priced.some(({ splitFactor }) => isSplit(splitFactor)));
        const plain = gaps.filter((gap) => !split.includes(gap));

        summary.written += await writeGaps(plain, now);
        summary.filled += plain.length;
        for (const gap of split) {
            if (await restate(gap)) summary.restated += 1;
            else summary.failed += 1;
        }
        await applyDividends(gaps.flatMap(dividendsOf));

        logger.info({ batch: index + 1, of: batches.length, ...summary }, 'Backfill progress');
    }

    return summary;
}

/**
 * Where a symbol's gap starts and what the vendor has from there.
 * A failed request is logged at debug and counted: the vendor refuses tickers
 * it does not carry, and thousands of those would bury the progress lines.
 */
async function checkGap(symbol: string, now: Date): Promise<Outcome> {
    try {
        const start = await findGapStart(symbol, now);
        if (start === null) return { status: 'current' };

        const rows = await dailyHistory(symbol, start.toISOString().slice(0, 10));
        const priced = toPricedHistory(symbol, rows).filter(({ bar }) => bar.timestamp >= start);
        return priced.length === 0 ? { status: 'current' } : { status: 'gap', gap: { symbol, start, priced } };
    } catch (err) {
        logger.debug({ err, symbol }, 'Backfill could not fetch a symbol');
        return { status: 'failed' };
    }
}

/**
 * The first session the symbol has no bar for, or null when it has them all up
 * to yesterday. Read from the stored sessions rather than the last bar alone,
 * because the live feed may already have written a bar after the gap.
 */
async function findGapStart(symbol: string, now: Date): Promise<Date | null> {
    const daily = getDb().collection<OhlcvDoc>('OHCLVData');
    const projection = { _id: 0, timestamp: 1 };

    const recent = await daily
        .find({ tickerID: symbol, timestamp: { $gte: new Date(now.getTime() - LOOKBACK_DAYS * DAY) } }, { projection })
        .toArray();
    if (recent.length > 0) {
        return findFirstMissingSession(
            recent.map(({ timestamp }) => timestamp),
            new Date(now.getTime() - DAY),
        );
    }

    const [last] = await daily.find({ tickerID: symbol }, { projection }).sort({ timestamp: -1 }).limit(1).toArray();
    return last === undefined ? HISTORY_START : new Date(last.timestamp.getTime() + DAY);
}

/**
 * Store the gaps of symbols with no split in them, and everything derived
 * from those bars. Delete first: a bar the live feed wrote inside the gap is
 * replaced by the vendor's. A crash between the two leaves the stretch empty,
 * which the next run finds as a gap again.
 */
async function writeGaps(gaps: readonly Gap[], now: Date): Promise<number> {
    if (gaps.length === 0) return 0;
    const daily = getDb().collection<OhlcvDoc>('OHCLVData');

    await Promise.all(
        gaps.map(({ symbol, start }) => daily.deleteMany({ tickerID: symbol, timestamp: { $gte: start } })),
    );
    const bars = gaps.flatMap(({ priced }) => priced.map(({ bar }) => bar));
    await daily.insertMany(bars, { ordered: false });

    // Older closing minutes would only be pruned by the nightly that follows
    const retained = now.getTime() - config.organize.intradayRetentionDays * DAY;
    await insertMissingBars(
        'OHCLVData1m',
        bars.filter((bar) => bar.timestamp.getTime() >= retained).map(closingMinute),
    );

    await rebuildWeeks(gaps, now);
    return bars.length;
}

/**
 * Rebuild the weeks the gaps touched. The gaps inside the lookback share one
 * rebuild from the earliest of them; an older one rebuilds its own symbol
 * whole, so one long gap does not drag the batch's every symbol back with it.
 */
async function rebuildWeeks(gaps: readonly Gap[], now: Date): Promise<void> {
    const lookback = now.getTime() - LOOKBACK_DAYS * DAY;
    const recent = gaps.filter(({ start }) => start.getTime() >= lookback);
    const older = gaps.filter(({ start }) => start.getTime() < lookback);

    const since = Math.min(...recent.map(({ start }) => start.getTime()));
    if (Number.isFinite(since)) {
        await updateWeeksFor(
            recent.map(({ symbol }) => symbol),
            new Date(since),
        );
    }
    await Promise.all(older.map(({ symbol }) => rebuildWeekly(symbol)));
}

/**
 * A symbol that split during its gap: record each split, then refetch the
 * whole history restated for it. Recorded first, so a crash before the refetch
 * leaves the gap in place and the next run does both again.
 */
async function restate(gap: Gap): Promise<boolean> {
    const splits = gap.priced.filter(({ splitFactor }) => isSplit(splitFactor));
    try {
        await Promise.all(
            splits.map(({ bar, splitFactor }) =>
                recordSplit({ symbol: gap.symbol, at: bar.timestamp, factor: splitFactor }),
            ),
        );
        await refetchHistory(gap.symbol, await dailyHistory(gap.symbol));
        await rebuildWeekly(gap.symbol);
        logger.info({ symbol: gap.symbol, splits: splits.length }, 'Backfill restated a split history');
        return true;
    } catch (err) {
        logger.error({ err, symbol: gap.symbol }, 'Backfill could not restate a split history');
        return false;
    }
}

function dividendsOf(gap: Gap): { symbol: string; at: Date; amount: number }[] {
    return gap.priced.flatMap(({ bar, divCash }) =>
        Number.isFinite(divCash) && divCash > 0 ? [{ symbol: gap.symbol, at: bar.timestamp, amount: divCash }] : [],
    );
}
