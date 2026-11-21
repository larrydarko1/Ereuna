/**
 * last-bucket — the aggregator's last-published bucket per pair, read from Redis.
 * The aggregator keeps one key per (symbol, timeframe) beside each publish, so
 * a reader that arrives between trades has the bar as it stands. The socket
 * gateway answers a new watch with it, and the quote service prices today's
 * bar from it before the bar reaches Mongo.
 */
import {
    AGGREGATOR_TIMEFRAMES,
    BUCKET_MS,
    isOneOf,
    isRecord,
    lastCandleKey,
    type AggregateMessage,
    type AggregatorTimeframe,
} from '@ereuna/shared';

import { logger } from '@/lib/logger.js';
import { getRedis } from '@/lib/redis.js';

/**
 * The bucket currently being built for a pair, or null when there is none.
 * A chart opened halfway through a bucket would otherwise show nothing until
 * the next trade. Anything older than one bucket width is not the live bucket —
 * it is whatever the aggregator last wrote before the market closed — so it is
 * dropped rather than presented as current.
 */
export async function readLastCandle(symbol: string, timeframe: AggregatorTimeframe): Promise<AggregateMessage | null> {
    let raw: string | null;
    try {
        raw = await getRedis().get(lastCandleKey(symbol, timeframe));
    } catch (err) {
        logger.warn({ err, symbol, timeframe }, 'Last-candle read failed');
        return null;
    }

    if (raw === null) return null;

    const message = parseBucket(raw);
    if (message === null) return null;

    const age = Date.now() - Date.parse(message.timestamp);
    return age >= 0 && age < BUCKET_MS[timeframe] ? message : null;
}

/** A Redis payload as an aggregate message, or null when it is not one we can use. */
export function parseBucket(payload: string): AggregateMessage | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(payload);
    } catch {
        return null;
    }

    if (!isRecord(parsed)) return null;

    const symbol = parsed['tickerID'];
    const timeframe = parsed['timeframe'];
    const timestamp = parsed['timestamp'] ?? parsed['start'];

    if (typeof symbol !== 'string' || symbol === '') return null;
    if (!isOneOf(AGGREGATOR_TIMEFRAMES, timeframe)) return null;
    if (typeof timestamp !== 'string') return null;

    const instant = toUtcIso(timestamp);
    if (instant === null) return null;

    const open = finite(parsed['open']);
    const high = finite(parsed['high']);
    const low = finite(parsed['low']);
    const close = finite(parsed['close']);
    if (open === null || high === null || low === null || close === null) return null;

    return {
        tickerID: symbol.toUpperCase(),
        timeframe,
        timestamp: instant,
        open,
        high,
        low,
        close,
        volume: finite(parsed['volume']) ?? 0,
        final: parsed['final'] === true,
    };
}

/**
 * A bucket timestamp as a canonical UTC instant, or null when it is not a date.
 * Every producer writes UTC, but not all of them say so: a string with no zone
 * designator is parsed as local time by `Date`, which silently shifts the bar
 * by the server's own offset. Stating the zone is what stops that.
 */
function toUtcIso(timestamp: string): string | null {
    const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/.test(timestamp) ? timestamp : `${timestamp}Z`;
    const parsed = new Date(zoned);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function finite(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
