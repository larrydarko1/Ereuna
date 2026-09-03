/** Splits and dividends: recording them, and repairing what a split invalidates. */
import type { OhlcvDoc } from '@ereuna/shared';
import { INTRADAY_COLLECTIONS } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { dailyHistory } from '@/lib/tiingo.js';
import { refetchHistory } from '@/organize/prices.js';
import { rebuildWeekly } from '@/organize/weekly.js';
import { assetInfoUpdates } from '@/organize/write.js';

export type Split = { symbol: string; at: Date; factor: number };
export type Dividend = { symbol: string; at: Date; amount: number };

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
            await adjustIntraday(split.symbol, split.factor);
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
            { Symbol: dividend.symbol, 'dividends.date': { $ne: date } },
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
        { Symbol: split.symbol, 'splits.date': { $ne: date } },
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

/**
 * Restate the intraday bars a split has invalidated.
 */
function isoDate(at: Date): string {
    return at.toISOString().slice(0, 10);
}

async function adjustIntraday(symbol: string, factor: number): Promise<void> {
    if (!Number.isFinite(factor) || factor <= 0) return;
    const db = getDb();

    for (const collection of INTRADAY_COLLECTIONS) {
        const result = await db.collection<OhlcvDoc>(collection).updateMany({ tickerID: symbol }, [
            {
                $set: {
                    open: { $divide: ['$open', factor] },
                    high: { $divide: ['$high', factor] },
                    low: { $divide: ['$low', factor] },
                    close: { $divide: ['$close', factor] },
                    volume: { $multiply: ['$volume', factor] },
                },
            },
        ]);
        logger.debug({ symbol, collection, adjusted: result.modifiedCount }, 'Intraday bars adjusted for split');
    }
}
