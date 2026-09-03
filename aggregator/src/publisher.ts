/**
 * Publishing a candle to everything that reads the live feed.
 * Two writes per candle: a message on `aggr:{tf}`, which every API process is
 * pattern-subscribed to, and a last-value key so a client that connects
 * mid-bucket has something to show before the next trade arrives.
 * Publishing is fire-and-forget by design. The durable copy is the Mongo write,
 * which is a separate path — a Redis outage costs the live tick and nothing
 * else, and blocking the aggregation loop on it would turn that into a gap in
 * the stored history as well.
 */
import { Counter } from 'prom-client';
import {
    BUCKET_MS,
    aggregateChannel,
    lastCandleKey,
    type AggregateMessage,
    type AggregatorTimeframe,
} from '@ereuna/shared';
import { logger } from '@/lib/logger.js';
import { getPublisher } from '@/lib/redis.js';

const published = new Counter({
    name: 'aggregator_candles_published_total',
    help: 'Candles published to the live feed',
    labelNames: ['timeframe', 'final'],
});

const publishFailures = new Counter({
    name: 'aggregator_publish_failures_total',
    help: 'Candles that could not be published to the live feed',
});

export function publishCandle(message: AggregateMessage): void {
    void send(message);
}

async function send(message: AggregateMessage): Promise<void> {
    const payload = JSON.stringify(message);
    const key = lastCandleKey(message.tickerID, message.timeframe);

    try {
        await getPublisher()
            .multi()
            .publish(aggregateChannel(message.timeframe), payload)
            // Expiring at twice the bucket width is what stops a client that
            // connects on a closed market being handed yesterday's last bar as
            // though it were the one currently building.
            .set(key, payload, 'PX', staleAfter(message.timeframe))
            .exec();
        published.inc({ timeframe: message.timeframe, final: String(message.final === true) });
    } catch (err) {
        publishFailures.inc();
        logger.warn({ err, symbol: message.tickerID, timeframe: message.timeframe }, 'Candle publish failed');
    }
}

function staleAfter(timeframe: AggregatorTimeframe): number {
    return BUCKET_MS[timeframe] * 2;
}
