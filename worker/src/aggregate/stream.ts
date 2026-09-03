/**
 * The trade stream: `tiingo:stream` in, `applyTrade` out.
 * Read through a consumer group rather than a plain subscription, so a restart
 * resumes from the last acknowledged id instead of silently missing whatever
 * arrived while the process was down. The group is created on first use with
 * `MKSTREAM`, which is what lets the aggregator start before the ingestor has
 * ever written anything.
 * The vendor's payload is a positional array. Its shape is decoded here and
 * nowhere else: everything downstream sees a symbol, a price and an instant.
 */
import { Counter } from 'prom-client';
import { TIINGO_GROUP, TIINGO_STREAM } from '@ereuna/shared';
import { applyTrade } from '@/aggregate/builder.js';
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';
import { getConsumer } from '@/lib/redis.js';

type StreamEntry = [id: string, fields: string[]];
type StreamRead = [stream: string, entries: StreamEntry[]][] | null;

const consumed = new Counter({
    name: 'aggregator_trades_consumed_total',
    help: 'Trades read from the vendor stream',
});

const rejected = new Counter({
    name: 'aggregator_trades_rejected_total',
    help: 'Stream entries that could not be read as a trade',
    labelNames: ['reason'],
});

/**
 * Read trades until `shouldStop` says otherwise.
 * Errors are logged and retried after a pause rather than thrown: the stream is
 * this service's only input, and a Redis blip that ended the loop would leave a
 * process that is running, healthy and permanently idle.
 */
export async function consumeTrades(shouldStop: () => boolean): Promise<void> {
    const redis = getConsumer();
    const name = `${TIINGO_GROUP}-${process.pid}`;

    try {
        await redis.xgroup('CREATE', TIINGO_STREAM, TIINGO_GROUP, '0', 'MKSTREAM');
    } catch {
        // BUSYGROUP: it already exists, which is the normal case on every
        // start after the first.
    }

    logger.info({ stream: TIINGO_STREAM, group: TIINGO_GROUP, consumer: name }, 'Consuming the trade stream');

    while (!shouldStop()) {
        try {
            const response = (await redis.xreadgroup(
                'GROUP',
                TIINGO_GROUP,
                name,
                'COUNT',
                config.stream.batchSize,
                'BLOCK',
                config.stream.blockMs,
                'STREAMS',
                TIINGO_STREAM,
                '>',
            )) as StreamRead;

            if (response === null) continue;

            const ids: string[] = [];
            for (const [, entries] of response) {
                for (const [id, fields] of entries) {
                    ids.push(id);
                    handle(fields);
                }
            }

            // Acknowledged as a batch: one round trip per read rather than one
            // per trade, and a crash before the ack simply replays the batch,
            // which the upsert on the way out makes harmless.
            if (ids.length > 0) await redis.xack(TIINGO_STREAM, TIINGO_GROUP, ...ids);
        } catch (err) {
            logger.error({ err }, 'Trade stream read failed');
            await sleep(1000);
        }
    }
}

function handle(fields: string[]): void {
    const index = fields.indexOf('data');
    const payload = index === -1 ? undefined : fields[index + 1];
    if (payload === undefined) {
        rejected.inc({ reason: 'no-data-field' });
        return;
    }

    const trade = parseTrade(payload);
    if (trade === null) return;

    consumed.inc();
    applyTrade(trade.symbol, trade.price, trade.at);
}

/**
 * The vendor's IEX payload as a trade.
 * `data` is positional — `[instant, ticker, price, …]` — which is why every
 * field is checked rather than trusted: a shape change upstream would otherwise
 * reach the candle state as a `NaN` price and poison the bar's high or low for
 * the rest of the bucket.
 */
function parseTrade(payload: string): { symbol: string; price: number; at: number } | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(payload);
    } catch {
        rejected.inc({ reason: 'malformed' });
        return null;
    }

    const message = parsed as { service?: unknown; data?: unknown };
    if (message.service !== 'iex' || !Array.isArray(message.data) || message.data.length <= 2) {
        rejected.inc({ reason: 'unrecognised' });
        return null;
    }

    const [instant, ticker, price] = message.data as unknown[];
    if (typeof ticker !== 'string' || ticker === '') {
        rejected.inc({ reason: 'no-symbol' });
        return null;
    }

    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) {
        rejected.inc({ reason: 'no-price' });
        return null;
    }

    const at = toEpochMs(instant);
    if (at === null) {
        rejected.inc({ reason: 'no-timestamp' });
        return null;
    }

    return { symbol: ticker.toUpperCase(), price: value, at };
}

/** A vendor timestamp as epoch milliseconds — epoch ms already, or an ISO instant. */
function toEpochMs(instant: unknown): number | null {
    if (typeof instant === 'number') return Number.isFinite(instant) ? instant : null;
    if (typeof instant !== 'string') return null;

    // A string with no zone designator is parsed as local time by `Date`, which
    // would shift every bar by the server's own offset.
    const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/.test(instant) ? instant : `${instant}Z`;
    const parsed = Date.parse(zoned);
    return Number.isNaN(parsed) ? null : parsed;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
