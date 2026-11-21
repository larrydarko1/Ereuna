/**
 * The trading session, and what happens at each end of it: a week-to-date bar
 * restored when a session opens, every open bucket finalised when one closes,
 * and no trade let in that belongs to neither. Bars are written once and
 * replaced on `(tickerID, timestamp)`, so a print that reopened a finalised
 * bucket would be swept later as a bar of its own and overwrite the real one.
 * Session state is derived from the same helper the API uses, so the two cannot
 * disagree about whether the market is open, and it resolves the boundary
 * through `Intl` rather than a fixed UTC hour — a hardcoded close is correct for
 * seven months of the year.
 */
import { isMarketHours, sessionClose } from '@ereuna/shared';

import { bucketStart } from '@/aggregate/buckets.js';
import { closeSession, openBucketCount, seedWeekly, sweep } from '@/aggregate/builder.js';
import { flush, pendingWrites, type CandleDoc } from '@/aggregate/writer.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';

const WEEKLY_COLLECTION = 'OHCLVData2';
const DAY_MS = 86_400_000;

let ticker: NodeJS.Timeout | undefined;
let wasOpen = false;
/** The close of the newest session whose bars are already written, as epoch ms. */
let sealedThrough = 0;

export async function startSession(): Promise<void> {
    wasOpen = isMarketHours();
    // A restart has no buckets to finalise, so a backlog from a session that
    // already closed could only build bars of a few prints each
    sealedThrough = latestCloseAt(Date.now());
    if (wasOpen) await onOpen();

    ticker = setInterval(() => void tick(), config.candles.sweepIntervalMs);
}

/**
 * Whether a trade belongs to a bar still being built: stamped inside regular
 * hours, and after the last close that was finalised. Judged by the trade's own
 * time rather than by the tick, which notices the open up to an interval late
 * and would drop the opening prints.
 */
export function isInSession(at: number): boolean {
    return at >= sealedThrough && isMarketHours(new Date(at));
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
    sealedThrough = latestCloseAt(Date.now());
    await flush();
    logger.info({ pendingWrites: pendingWrites() }, 'Session finalised');
}

/** The newest regular-session close at or before `now`. A weekend's is harmless: no print is stamped then. */
function latestCloseAt(now: number): number {
    const today = sessionClose(new Date(now)).getTime();
    return today <= now ? today : sessionClose(new Date(now - DAY_MS)).getTime();
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
        const bars = await getDb().collection<CandleDoc>(WEEKLY_COLLECTION).find({ timestamp: weekStart }).toArray();

        seedWeekly(bars);
        logger.info({ weekStart: weekStart.toISOString(), bars: bars.length }, 'Week-to-date bars restored');
    } catch (err) {
        // Not fatal. The week's bars are rebuilt from daily data by the
        // organizer overnight, so the cost of failing here is an intraday
        // weekly bar that opens at today's price until then.
        logger.error({ err }, 'Failed to restore week-to-date bars');
    }
}
