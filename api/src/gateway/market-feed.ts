/**
 * market-feed — the aggregator's Redis output, read once per API process.
 * The aggregator publishes every bucket it closes or updates on `aggr:{tf}`.
 * This holds a single pattern subscription to all of them and hands each
 * message to one sink, which is the socket gateway's fan-out. One subscription
 * per process, never one per connected client: a thousand charts on one symbol
 * cost one Redis message, not a thousand.
 * The subscriber runs on its own connection because a Redis client in
 * subscriber mode may not issue ordinary commands, and `readLastCandle` needs
 * to. It is not the shared singleton for the same reason.
 */
import { Redis } from 'ioredis';
import {
    AGGREGATE_CHANNEL_PATTERN,
    AGGREGATOR_TIMEFRAMES,
    BUCKET_MS,
    lastCandleKey,
    type AggregateMessage,
    type AggregatorTimeframe,
} from '@ereuna/shared';
import { config } from '@/lib/config.js';
import { getRedis } from '@/lib/redis.js';
import { logger } from '@/lib/logger.js';

export type BucketSink = (message: AggregateMessage) => void;

const TIMEFRAMES = new Set<string>(AGGREGATOR_TIMEFRAMES);

let subscriber: Redis | null = null;

/**
 * Begin forwarding aggregated buckets to `sink`.
 * A failure to subscribe is logged and not thrown: the API serves history from
 * Mongo whether or not the live feed is up, and a chart that never ticks is a
 * far smaller failure than an API that will not boot.
 */
export async function startMarketFeed(sink: BucketSink): Promise<void> {
    const client = new Redis({ host: config.redis.host, port: config.redis.port, maxRetriesPerRequest: null });
    client.on('error', (err) => logger.error({ err }, 'Market feed subscriber error'));

    client.on('pmessage', (_pattern: string, _channel: string, payload: string) => {
        const message = parseBucket(payload);
        if (message !== null) sink(message);
    });

    try {
        await client.psubscribe(AGGREGATE_CHANNEL_PATTERN);
        subscriber = client;
        logger.info({ pattern: AGGREGATE_CHANNEL_PATTERN }, 'Market feed subscribed');
    } catch (err) {
        logger.error({ err }, 'Market feed subscribe failed — live candles will not tick');
        client.disconnect();
    }
}

export async function stopMarketFeed(): Promise<void> {
    if (subscriber === null) return;
    const client = subscriber;
    subscriber = null;
    await client.quit();
}

/**
 * The bucket currently being built for a pair, or null when there is none.
 * A chart opened halfway through a bucket would otherwise show nothing until
 * the next trade. Anything older than one bucket width is not the live bucket —
 * it is whatever the aggregator last wrote before the market closed — so it is
 * dropped rather than presented as current.
 */
export async function readLastCandle(
    symbol: string,
    timeframe: AggregatorTimeframe,
): Promise<AggregateMessage | null> {
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
function parseBucket(payload: string): AggregateMessage | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(payload);
    } catch {
        return null;
    }

    if (typeof parsed !== 'object' || parsed === null) return null;
    const value = parsed as Record<string, unknown>;

    const symbol = value.tickerID;
    const timeframe = value.timeframe;
    const timestamp = value.timestamp ?? value.start;

    if (typeof symbol !== 'string' || symbol === '') return null;
    if (typeof timeframe !== 'string' || !TIMEFRAMES.has(timeframe)) return null;
    if (typeof timestamp !== 'string') return null;

    const instant = toUtcIso(timestamp);
    if (instant === null) return null;

    const prices = ['open', 'high', 'low', 'close'] as const;
    if (prices.some((field) => typeof value[field] !== 'number' || !Number.isFinite(value[field]))) return null;

    return {
        tickerID: symbol.toUpperCase(),
        timeframe: timeframe as AggregatorTimeframe,
        timestamp: instant,
        open: value.open as number,
        high: value.high as number,
        low: value.low as number,
        close: value.close as number,
        volume: typeof value.volume === 'number' && Number.isFinite(value.volume) ? value.volume : 0,
        final: value.final === true,
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
