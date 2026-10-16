/**
 * WebSocket gateway — Socket.IO server for the live market feed.
 * One Socket.IO server for the whole API, attached to the existing HTTP server
 * rather than a second listener. It is the only thing that pushes: nothing
 * outside this directory holds an `io` handle, and no service emits.
 * Every socket joins rooms, never queues. `market-feed` holds one Redis
 * subscription for the whole process and this fans each bucket into the rooms
 * that want it, so a thousand charts on one symbol cost one Redis message.
 * **There is no Redis adapter, deliberately.** The adapter exists to route an
 * emit raised on one pod to a socket held by another. Here every pod subscribes
 * to `aggr:*` itself and therefore already holds every bucket its own sockets
 * need; adding the adapter would republish each one across pods to be discarded.
 * Event contract (the payload schemas are SERVER_EVENTS and CLIENT_EVENTS in @ereuna/shared):
 * Server → Client:
 *     candle:update — { symbol, timeframe, candle } for the pair this socket watches.
 *     quote:update  — { quotes } a partial symbol→price map, only what moved.
 * Client → Server:
 *     candle:watch — { symbol, timeframe }. Replaces this socket's candle subscription.
 *     quote:watch  — { symbols }. Replaces this socket's quote subscriptions.
 * Every push goes through `checkedPayload()`, which holds the payload to its
 * event's schema the way `send()` holds a REST answer to its route's: a payload
 * that does not fit is not sent, a field the schema does not declare is dropped,
 * and both are logged as errors. Every inbound payload is parsed with its
 * event's schema before anything reads it.
 * Both inbound events are client-controlled work, so they are rate limited per
 * user on top of the per-IP limit on the handshake itself.
 */
import { type Server as HttpServer } from 'http';

import { type DefaultEventsMap, Server, type Socket } from 'socket.io';
import type { z } from 'zod';

import {
    AGGREGATOR_TO_CHART,
    CHART_TO_AGGREGATOR,
    CLIENT_EVENTS,
    QUOTE_TIMEFRAME,
    SERVER_EVENTS,
    droppedKeys,
    isIntraday,
    type AggregateMessage,
    type AggregatorTimeframe,
    type ChartTimeframe,
    type ClientToServerEvents,
    type EventPayload,
    type LiveCandle,
    type ServerEvent,
    type ServerToClientEvents,
} from '@ereuna/shared';

import { readLastCandle, startMarketFeed, stopMarketFeed } from '@/gateway/market-feed.js';
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';
import { consumeTokenBucket, type TokenBucketOptions } from '@/lib/token-bucket.js';
import { verifyAccessToken } from '@/middleware/auth.js';

/** What this gateway keeps on each socket; `userId` is set once the handshake token checks out. */
type FeedData = {
    userId?: string;
    candleRoom?: string; // The one candle room this socket is in, so switching charts can leave it
    quoteRooms?: string[]; // The quote rooms this socket is in, so a new watchlist can leave them all
};

type FeedSocket = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, FeedData>;

const candleWatchSchema = CLIENT_EVENTS['candle:watch'];
const quoteWatchSchema = CLIENT_EVENTS['quote:watch'];

/**
 * Connection-time rate limit per client IP — 10 attempts burst, then one every
 * 6 seconds. Blocks handshake floods before any JWT verification happens.
 */
const CONN_BUCKET: TokenBucketOptions = { capacity: 10, refillPerMs: 1 / 6_000 };

/**
 * Per-user subscription changes — 30 burst, then one a second. A chart switch
 * or a portfolio reload is one message; anything sustaining more than that is
 * not a person clicking.
 */
const WATCH_BUCKET: TokenBucketOptions = { capacity: 30, refillPerMs: 1 / 1_000 };

/** Each push's schema, typed per event so a parse hands back that event's payload and no other. */
const PUSHES: { [TEvent in ServerEvent]: z.ZodType<EventPayload<TEvent>> } = SERVER_EVENTS;

/** The last price emitted per symbol, so an unchanged bucket is not re-sent. */
const lastPrices = new Map<string, number>();

let io: Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, FeedData> | undefined;

export async function initSocket(httpServer: HttpServer): Promise<void> {
    io = new Server(httpServer, {
        path: '/socket.io',
        cors: { origin: config.corsOrigin, credentials: true },
        // CORS does not govern WebSocket upgrades, so the origin is checked
        // here as well — for the polling transport `cors` is the real control,
        // for the upgrade it is this.
        allowRequest: (req, callback): void => {
            const origin = req.headers.origin;
            callback(null, origin === undefined || origin === config.corsOrigin);
        },
    });

    io.use((socket: FeedSocket, next) => {
        void (async () => {
            const { allowed } = await consumeTokenBucket(`rl:ws:conn:${clientIp(socket)}`, CONN_BUCKET);
            if (!allowed) {
                next(new Error('Too many connection attempts — slow down'));
                return;
            }
            next();
        })();
    });

    io.use((socket: FeedSocket, next) => {
        const token: unknown = socket.handshake.auth['token'];
        if (typeof token !== 'string' || token === '') {
            next(new Error('Missing token'));
            return;
        }

        // The same check as REST, which also refuses the 2FA challenge token
        const userId = verifyAccessToken(token);
        if (userId === null) {
            next(new Error('Invalid token'));
            return;
        }
        socket.data.userId = userId;
        next();
    });

    io.on('connection', (socket: FeedSocket) => {
        const { userId } = socket.data;
        // The auth middleware above refuses every socket without one; this only keeps the type honest
        if (userId === undefined) return void socket.disconnect(true);
        socket.on('candle:watch', (payload: unknown) => void watchCandle(socket, userId, payload));
        socket.on('quote:watch', (payload: unknown) => void watchQuotes(socket, userId, payload));
    });

    await startMarketFeed(dispatch);
}

export async function closeSocket(): Promise<void> {
    await stopMarketFeed();
    if (io !== undefined) {
        await io.close();
        io = undefined;
    }
    lastPrices.clear();
}

/** Fan one aggregated bucket into the rooms waiting for it. */
function dispatch(message: AggregateMessage): void {
    if (io === undefined) return;

    const timeframe = AGGREGATOR_TO_CHART[message.timeframe];
    const update = checkedPayload('candle:update', {
        symbol: message.tickerID,
        timeframe,
        candle: formatCandle(message, timeframe),
    });
    if (update !== undefined) io.to(candleRoom(message.tickerID, message.timeframe)).emit('candle:update', update);

    if (message.timeframe !== QUOTE_TIMEFRAME) return;

    // Deduplicated per process rather than per socket: a bucket that closes
    // without a price change is the common case near the bell, and every
    // connected client would otherwise be woken for a value it already has.
    if (lastPrices.get(message.tickerID) === message.close) return;
    lastPrices.set(message.tickerID, message.close);
    const quotes = checkedPayload('quote:update', { quotes: { [message.tickerID]: message.close } });
    if (quotes !== undefined) io.to(quoteRoom(message.tickerID)).emit('quote:update', quotes);
}

async function watchCandle(socket: FeedSocket, userId: string, payload: unknown): Promise<void> {
    const parsed = candleWatchSchema.safeParse(payload);
    if (!parsed.success || !(await allowWatch(userId))) return;

    const { symbol, timeframe } = parsed.data;
    const bucket = CHART_TO_AGGREGATOR[timeframe];
    const room = candleRoom(symbol, bucket);

    if (socket.data.candleRoom === room) return;
    if (socket.data.candleRoom !== undefined) await socket.leave(socket.data.candleRoom);
    await socket.join(room);
    socket.data.candleRoom = room;

    // A chart opened mid-bucket should not stare at an empty last bar until the
    // next trade, so the bucket as it stands right now is sent immediately.
    const opening = await readLastCandle(symbol, bucket);
    if (opening === null || socket.data.candleRoom !== room) return;
    const update = checkedPayload('candle:update', { symbol, timeframe, candle: formatCandle(opening, timeframe) });
    if (update !== undefined) socket.emit('candle:update', update);
}

async function watchQuotes(socket: FeedSocket, userId: string, payload: unknown): Promise<void> {
    const parsed = quoteWatchSchema.safeParse(payload);
    if (!parsed.success || !(await allowWatch(userId))) return;

    const symbols = [...new Set(parsed.data.symbols)];
    // join/leave are synchronous on the in-memory adapter, which is the only one
    // this gateway uses — see the note on why there is no Redis adapter.
    for (const room of socket.data.quoteRooms ?? []) void socket.leave(room);
    const rooms = symbols.map(quoteRoom);
    socket.data.quoteRooms = rooms;
    for (const room of rooms) void socket.join(room);

    const quotes: Record<string, number> = {};
    for (const symbol of symbols) {
        const opening = await readLastCandle(symbol, QUOTE_TIMEFRAME);
        if (opening !== null) quotes[symbol] = opening.close;
    }
    if (Object.keys(quotes).length === 0) return;
    const update = checkedPayload('quote:update', { quotes });
    if (update !== undefined) socket.emit('quote:update', update);
}

/**
 * A payload held to its event's schema, parsed so only declared fields reach a
 * socket; `undefined` when the parse refused it. Anything refused or dropped is
 * logged by path, never by value. Neither throws: a push runs off a Redis
 * message, with no request to fail and no one to answer.
 */
function checkedPayload<TEvent extends ServerEvent>(
    event: TEvent,
    payload: EventPayload<TEvent>,
): EventPayload<TEvent> | undefined {
    const parsed = PUSHES[event].safeParse(payload);
    if (!parsed.success) {
        const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
        logger.error({ event, issues }, 'Socket payload did not match its schema; not sent');
        return undefined;
    }
    const dropped = droppedKeys(payload, parsed.data);
    if (dropped.length > 0)
        logger.error({ event, dropped }, 'Socket payload carried fields its schema does not declare');
    return parsed.data;
}

/**
 * One bucket in the shape the chart API already serves. The time format has to
 * match `market-bars.ts` exactly or the client cannot address the same bar.
 */
function formatCandle(message: AggregateMessage, timeframe: ChartTimeframe): LiveCandle {
    return {
        time: isIntraday(timeframe) ? message.timestamp.slice(0, 19) : message.timestamp.slice(0, 10),
        open: message.open,
        high: message.high,
        low: message.low,
        close: message.close,
        volume: message.volume ?? 0,
        final: message.final === true,
    };
}

/** Spend one subscription-change token for this user. */
async function allowWatch(userId: string): Promise<boolean> {
    const { allowed } = await consumeTokenBucket(`rl:ws:watch:${userId}`, WATCH_BUCKET);
    if (!allowed) logger.warn({ userId }, 'Socket subscription rate limit hit');
    return allowed;
}

function candleRoom(symbol: string, timeframe: AggregatorTimeframe): string {
    return `candle:${symbol}:${timeframe}`;
}

function quoteRoom(symbol: string): string {
    return `quote:${symbol}`;
}

/**
 * Resolve the real client IP for a handshake, mirroring Express `trust proxy`.
 * Socket.IO does not honour it, so without this every connection keys off the
 * proxy address and the per-IP limit collapses to one shared bucket.
 */
function clientIp(socket: FeedSocket): string {
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const parts = (raw ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    if (parts.length === 0) return socket.handshake.address;
    const index = Math.max(0, parts.length - config.trustProxyHops);
    return parts[index] ?? socket.handshake.address;
}
