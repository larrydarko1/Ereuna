/**
 * Bucket boundaries — where one candle ends and the next begins.
 * Pure arithmetic on epoch milliseconds, deliberately free of any state or I/O
 * so the one piece of this service that is easy to get subtly wrong is also the
 * one piece that is trivial to test.
 * Every boundary is UTC. Regular US trading hours never cross UTC midnight
 * (13:30–21:00 UTC at the widest), so a UTC day and a trading day are the same
 * day for everything this service buckets — which is what lets a daily bar be
 * plain UTC-midnight arithmetic rather than a timezone conversion per trade.
 */
import { BUCKET_MS, type AggregatorTimeframe } from '@ereuna/shared';

const DAY_MS = 86_400_000;

/** The start of the bucket that `at` falls in. */
export function bucketStart(timeframe: AggregatorTimeframe, at: number): number {
    if (timeframe === '1w') return weekStart(at);
    if (timeframe === '1d') return at - modulo(at, DAY_MS);
    return at - modulo(at, BUCKET_MS[timeframe]);
}

/** The first instant that no longer belongs to the bucket `at` falls in. */
export function bucketEnd(timeframe: AggregatorTimeframe, at: number): number {
    return bucketStart(timeframe, at) + BUCKET_MS[timeframe];
}

/**
 * Monday 00:00 UTC of the week `at` falls in.
 * The epoch was a Thursday, so a plain modulo of the week length lands on
 * Thursday rather than Monday — the offset is what corrects for that.
 */
function weekStart(at: number): number {
    const days = Math.floor(at / DAY_MS);
    // 1970-01-01 was a Thursday, i.e. index 3 in a Monday-first week.
    const weekday = modulo(days + 3, 7);
    return (days - weekday) * DAY_MS;
}

/** Euclidean remainder: `%` keeps the sign of the dividend, which is wrong before 1970. */
function modulo(value: number, divisor: number): number {
    return ((value % divisor) + divisor) % divisor;
}
