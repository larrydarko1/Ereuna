/**
 * One Tiingo session: connect, subscribe, relay every trade into Redis, and
 * unsubscribe on the way out.
 * A session lasts exactly one market day. The upstream socket is opened when
 * the bell rings and dropped when it rings again, rather than held open
 * overnight against a silent feed — a connection that has been idle for
 * sixteen hours is one that fails on the first message rather than the first
 * heartbeat, and there is nothing to lose by rebuilding it.
 * Messages are relayed verbatim. The stream is the seam with the aggregator and
 * the aggregator is what understands the vendor's positional payload; parsing
 * it here would put the same knowledge in two processes.
 */
import { Counter } from 'prom-client';
import { z } from 'zod';

import { isList, isRecord, TIINGO_STREAM, TIINGO_STREAM_MAXLEN } from '@ereuna/shared';

import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';
import { getRedis } from '@/lib/redis.js';

// The vendor's protocol frames: the subscribe ack carries `subscriptionId`, the
// unsubscribe reply the tickers still subscribed. A trade's `data` is an array,
// so a trade never parses as one of these.
const replySchema = z.object({
    messageType: z.string().optional(),
    data: z.object({ subscriptionId: z.number().optional(), tickers: z.array(z.string()).optional() }).optional(),
    response: z.object({ code: z.number().optional(), message: z.string().optional() }).optional(),
});

type VendorReply = z.infer<typeof replySchema>;

const relayed = new Counter({
    name: 'ingestor_messages_relayed_total',
    help: 'Trade messages forwarded from the vendor feed into Redis',
});

const relayedBytes = new Counter({
    name: 'ingestor_bytes_relayed_total',
    help: 'Bytes of trade payload forwarded from the vendor feed into Redis',
});

const dropped = new Counter({
    name: 'ingestor_messages_dropped_total',
    help: 'Vendor messages discarded before Redis',
    labelNames: ['reason'],
});

/**
 * Run one session and resolve when the socket closes, however it closed.
 * It never rejects: every ending — a clean market close, a dropped connection,
 * a vendor error — puts the caller back in the same place, waiting for the next
 * open. Distinguishing them would only be a different log line.
 */
export function runSession(symbols: readonly string[], shouldStop: () => boolean): Promise<void> {
    return new Promise((resolve): void => {
        const socket = new WebSocket(config.tiingo.url);
        let subscriptionId: number | null = null;
        let closing = false;
        let unsubscribeDeadline: NodeJS.Timeout | undefined;

        const handshake = setTimeout(() => {
            if (subscriptionId === null) {
                logger.error('No subscribe acknowledgement from the vendor — closing');
                stop();
            }
        }, config.tiingo.handshakeTimeoutMs);

        const poll = setInterval(() => {
            if (shouldStop()) stop();
        }, 1000);

        function stop(): void {
            if (closing) return;
            closing = true;
            if (subscriptionId === null) {
                socket.close();
                return;
            }
            socket.send(
                JSON.stringify({
                    eventName: 'unsubscribe',
                    authorization: config.tiingo.key,
                    eventData: { subscriptionId, tickers: symbols },
                }),
            );
            // The close waits for the vendor's answer: a socket dropped before the
            // unsubscribe is processed is how a subscription outlives its socket
            const id = subscriptionId;
            unsubscribeDeadline = setTimeout(() => {
                logger.warn({ subscriptionId: id }, 'No answer to the unsubscribe — closing anyway');
                socket.close();
            }, config.tiingo.unsubscribeTimeoutMs);
        }

        socket.onopen = (): void => {
            logger.info({ symbols: symbols.length }, 'Subscribing to the vendor trade feed');
            socket.send(
                JSON.stringify({
                    eventName: 'subscribe',
                    authorization: config.tiingo.key,
                    eventData: { thresholdLevel: config.tiingo.thresholdLevel, tickers: symbols },
                }),
            );
        };

        socket.onmessage = (event: MessageEvent): void => {
            const raw = typeof event.data === 'string' ? event.data : '';
            if (raw === '') return;

            if (subscriptionId === null) {
                subscriptionId = readSubscriptionId(raw);
                if (subscriptionId === null) return;
                clearTimeout(handshake);
                logger.info({ subscriptionId }, 'Subscribed');
                return;
            }

            // Checked per message, not only on the poll: the feed keeps pricing after
            // the bell, and the aggregator buckets whatever reaches it
            if (!closing && shouldStop()) stop();

            if (closing) {
                const reply = readReply(raw);
                if (reply === null || reply.messageType === 'H') return;
                logUnsubscribeReply(subscriptionId, reply);
                clearTimeout(unsubscribeDeadline);
                socket.close();
                return;
            }

            void relay(raw);
        };

        socket.onerror = (): void => {
            // No detail is exposed on a browser-shaped error event, and `close`
            // always follows, which is where the session actually ends.
            logger.error('Vendor feed socket error');
        };

        socket.onclose = (): void => {
            clearTimeout(handshake);
            clearTimeout(unsubscribeDeadline);
            clearInterval(poll);
            logger.info('Vendor feed session ended');
            resolve();
        };
    });
}

/** Forward one vendor message to the aggregator's stream. */
async function relay(raw: string): Promise<void> {
    if (!isTrade(raw)) return;

    try {
        // Trimmed approximately: the stream is a buffer that lets the aggregator
        // restart without losing the last few seconds, not a record of the day.
        await getRedis().xadd(TIINGO_STREAM, 'MAXLEN', '~', TIINGO_STREAM_MAXLEN, '*', 'data', raw);
        relayed.inc();
        relayedBytes.inc(Buffer.byteLength(raw));
    } catch (err) {
        dropped.inc({ reason: 'redis' });
        logger.error({ err }, 'Failed to write a trade to Redis');
    }
}

/**
 * Whether a message is market data rather than protocol chatter.
 * The vendor interleaves heartbeats (`H`) and info frames (`I`) with the trade
 * stream; forwarding those would have the aggregator parse a payload that has
 * no symbol in it, once per heartbeat per session.
 */
function isTrade(raw: string): boolean {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        dropped.inc({ reason: 'malformed' });
        return false;
    }

    const message = isRecord(parsed) ? parsed : {};
    if (message['messageType'] === 'H' || message['messageType'] === 'I') return false;

    const data = message['data'];
    if (message['messageType'] !== 'A' || message['service'] !== 'iex' || !isList(data)) {
        dropped.inc({ reason: 'unrecognised' });
        return false;
    }

    // The aggregator reads three fixed positions out of this array; anything
    // shorter would reach it as an undefined price.
    if (data.length <= 2) {
        dropped.inc({ reason: 'truncated' });
        return false;
    }

    return true;
}

/** The subscription id from a subscribe acknowledgement, or null if it is not one. */
function readSubscriptionId(raw: string): number | null {
    const ack = readReply(raw);
    if (ack === null || ack.messageType === 'H') return null;
    const id = ack.data?.subscriptionId;
    if (typeof id === 'number') return id;
    logger.warn({ code: ack.response?.code, message: ack.response?.message }, 'Vendor rejected the subscription');
    return null;
}

/**
 * Log the vendor's answer to the unsubscribe. Confirmed means a 200 with no
 * tickers left; anything else is a subscription the vendor may still be running.
 */
function logUnsubscribeReply(subscriptionId: number, reply: VendorReply): void {
    const code = reply.response?.code;
    const remaining = reply.data?.tickers ?? [];
    if (code === 200 && remaining.length === 0) {
        logger.info({ subscriptionId }, 'Unsubscribed');
        return;
    }
    logger.warn(
        { subscriptionId, code, message: reply.response?.message, remaining: remaining.length },
        'Unsubscribe not confirmed',
    );
}

/** A protocol frame from the vendor, or null for a trade or anything unreadable. */
function readReply(raw: string): VendorReply | null {
    try {
        const parsed = replySchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
    } catch {
        // Not JSON, so not a reply; the relay is what counts malformed frames
        return null;
    }
}
