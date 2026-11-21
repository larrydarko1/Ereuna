/**
 * market-feed — the aggregator's Redis output, read once per API process.
 * The aggregator publishes every bucket it closes or updates on `aggr:{tf}`.
 * This holds a single pattern subscription to all of them and hands each
 * message to one sink, which is the socket gateway's fan-out. One subscription
 * per process, never one per connected client: a thousand charts on one symbol
 * cost one Redis message, not a thousand.
 * The subscriber runs on its own connection because a Redis client in
 * subscriber mode may not issue ordinary commands, which `readLastCandle`
 * (lib/last-bucket.ts) issues on the shared one.
 */
import { Redis } from 'ioredis';

import { AGGREGATE_CHANNEL_PATTERN, type AggregateMessage } from '@ereuna/shared';

import { config } from '@/lib/config.js';
import { parseBucket } from '@/lib/last-bucket.js';
import { logger } from '@/lib/logger.js';

export type BucketSink = (message: AggregateMessage) => void;

let subscriber: Redis | null = null;

/**
 * Begin forwarding aggregated buckets to `sink`.
 * A failure to subscribe is logged and not thrown: the API serves history from
 * Mongo whether or not the live feed is up, and a chart that never ticks is a
 * far smaller failure than an API that will not boot.
 */
export async function startMarketFeed(sink: BucketSink): Promise<void> {
    const client = new Redis({ ...config.redis, maxRetriesPerRequest: null });
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
