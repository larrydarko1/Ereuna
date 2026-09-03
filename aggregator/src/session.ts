/**
 * The trading session, and what happens at each end of it.
 * The aggregator does not gate on market hours — it buckets whatever arrives,
 * so a feed that one day carries something other than US equities needs no
 * change here. What it does need is the two edges: a week-to-date bar restored
 * when a session opens, and every open bucket finalised when one closes.
 * Session state is derived from the same helper the API uses, so the two cannot
 * disagree about whether the market is open, and it resolves the boundary
 * through `Intl` rather than a fixed UTC hour — a hardcoded close is correct for
 * seven months of the year.
 */
import { isMarketHours } from '@ereuna/shared';
import { closeSession, openBucketCount, seedWeekly, sweep } from '@/builder.js';
import { bucketStart } from '@/buckets.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { flush, pendingWrites, type CandleDoc } from '@/writer.js';

const WEEKLY_COLLECTION = 'OHCLVData2';

let ticker: NodeJS.Timeout | undefined;
let wasOpen = false;

/**
 * Start the clock that sweeps closed buckets and watches the session edges.
 * The initial state is read before the first tick so that a process started
 * mid-session does not see a false open→close transition on its first second.
 */
export async function startSession(): Promise<void> {
    wasOpen = isMarketHours();
    if (wasOpen) await onOpen();

    ticker = setInterval(() => void tick(), config.candles.sweepIntervalMs);
}

export function stopSession(): void {
    if (ticker !== undefined) clearInterval(ticker);
    ticker = undefined;
}

async function tick(): Promise<void> {
    const open = isMarketHours();

    if (open && !wasOpen) await onOpen();
    else if (!open && wasOpen) await onClose();

    wasOpen = open;
    sweep();
}

async function onOpen(): Promise<void> {
    logger.info('Market open');
    await restoreWeekToDate();
}

async function onClose(): Promise<void> {
    logger.info({ openBuckets: openBucketCount() }, 'Market closed — finalising');
    closeSession();
    await flush();
    logger.info({ pendingWrites: pendingWrites() }, 'Session finalised');
}

/**
 * Reload this week's weekly bars into the builder.
 * A weekly bar spans five sessions but the closing bell clears every bucket, so
 * without this the bar rebuilt on Tuesday would open at Tuesday's price and its
 * range would lose Monday entirely.
 */
async function restoreWeekToDate(): Promise<void> {
    const weekStart = new Date(bucketStart('1w', Date.now()));

    try {
        const bars = await getDb()
            .collection<CandleDoc>(WEEKLY_COLLECTION)
            .find({ timestamp: weekStart })
            .toArray();

        seedWeekly(bars);
        logger.info({ weekStart: weekStart.toISOString(), bars: bars.length }, 'Week-to-date bars restored');
    } catch (err) {
        // Not fatal. The week's bars are rebuilt from daily data by the
        // organizer overnight, so the cost of failing here is an intraday
        // weekly bar that opens at today's price until then.
        logger.error({ err }, 'Failed to restore week-to-date bars');
    }
}
