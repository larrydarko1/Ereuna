/** Splits and dividends: recording them, and repairing what a split invalidates. */
import type { OhlcvDoc } from '@ereuna/shared';
import { INTRADAY_COLLECTIONS } from '@ereuna/shared';

import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { dailyHistory } from '@/lib/tiingo.js';
import { refetchHistory } from '@/organize/prices.js';
import { rebuildWeekly } from '@/organize/weekly.js';
import { assetInfoUpdates } from '@/organize/write.js';

type Split = { symbol: string; at: Date; factor: number };
type Dividend = { symbol: string; at: Date; amount: number };

/**
 * Apply every split seen in tonight's bars.
 * Sequential, not concurrent: each one refetches a full history from the
 * vendor, and a night with many splits would otherwise open as many
 * simultaneous multi-decade downloads.
 */
export async function applySplits(splits: readonly Split[]): Promise<number> {
    let applied = 0;

    for (const split of splits) {
        try {
            if (!(await recordSplit(split))) continue;
            await refetchHistory(split.symbol, await dailyHistory(split.symbol));
            await rebuildWeekly(split.symbol);
            await adjustIntraday(split);
            applied += 1;
            logger.info({ symbol: split.symbol, factor: split.factor }, 'Split applied');
        } catch (err) {
            logger.error({ err, symbol: split.symbol }, 'Split could not be applied');
        }
    }

    return applied;
}

/** Record every dividend seen in tonight's bars. */
export async function applyDividends(dividends: readonly Dividend[]): Promise<number> {
    const collection = assetInfoUpdates();
    let applied = 0;

    for (const dividend of dividends) {
        const date = isoDate(dividend.at);
        const result = await collection.updateOne(
            { 'Symbol': dividend.symbol, 'dividends.date': { $ne: date } },
            {
                $push: { dividends: { date, amount: dividend.amount } },
                $set: { DividendDate: dividend.at },
            },
        );
        if (result.modifiedCount > 0) applied += 1;
    }

    logger.info({ applied, seen: dividends.length }, 'Dividends recorded');
    return applied;
}

/**
 * Append the split and restate the share count.
 * Returns false when the document already carries it, which is what makes the
 * expensive repair below run once per split rather than once per run.
 */
async function recordSplit(split: Split): Promise<boolean> {
    const date = isoDate(split.at);
    const result = await assetInfoUpdates().updateOne(
        { 'Symbol': split.symbol, 'splits.date': { $ne: date } },
        {
            $push: { splits: { date, ratio: split.factor } },
            // A forward split multiplies the count and a reverse one divides it;
            // multiplying by the factor is both, because a reverse split arrives
            // as a factor below one
            $mul: { SharesOutstanding: split.factor },
        },
    );

    return result.modifiedCount > 0;
}

function isoDate(at: Date): string {
    return at.toISOString().slice(0, 10);
}

/**
 * Restate the intraday bars a split has invalidated: the ones before its
 * ex-date. That session's own bars already traded at the new price, and so did
 * the closing minute the price step wrote for it.
 * Read, adjusted here and written back, because a time series collection
 * refuses to change a stored price. Delete before insert, so a failure between
 * the two loses those bars rather than doubling them; intraday bars are kept
 * for two weeks only, so that is the most at stake.
 */
async function adjustIntraday(split: Split): Promise<void> {
    const { symbol, at, factor } = split;
    if (!Number.isFinite(factor) || factor <= 0) return;
    const db = getDb();
    const before = { tickerID: symbol, timestamp: { $lt: at } };

    for (const collection of INTRADAY_COLLECTIONS) {
        const bars = db.collection<OhlcvDoc>(collection);
        const stored = await bars.find(before, { projection: { _id: 0 } }).toArray();
        if (stored.length === 0) continue;

        await bars.deleteMany(before);
        await bars.insertMany(
            stored.map((bar) => toSplitAdjusted(bar, factor)),
            { ordered: false },
        );
        logger.debug({ symbol, collection, adjusted: stored.length }, 'Intraday bars adjusted for split');
    }
}

/** A bar restated as if the split had always been in force: prices divided by the factor, volume multiplied. */
function toSplitAdjusted(bar: OhlcvDoc, factor: number): OhlcvDoc {
    return {
        tickerID: bar.tickerID,
        timestamp: bar.timestamp,
        open: bar.open / factor,
        high: bar.high / factor,
        low: bar.low / factor,
        close: bar.close / factor,
        volume: bar.volume * factor,
    };
}
