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
 * Event contract:
 * Server → Client:
 *     candle:update — { symbol, timeframe, candle } for the pair this socket watches.
 *     quote:update  — { quotes } a partial symbol→price map, only what moved.
 * Client → Server:
 *     candle:watch — { symbol, timeframe }. Replaces this socket's candle subscription.
 *     quote:watch  — { symbols }. Replaces this socket's quote subscriptions.
 * Both inbound events are client-controlled work, so they are rate limited per
 * user on top of the per-IP limit on the handshake itself.
 */
import { type Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import {
    AGGREGATOR_TO_CHART,
    CHART_TIMEFRAMES,
    CHART_TO_AGGREGATOR,
    QUOTE_TIMEFRAME,
    isIntraday,
    type AggregateMessage,
    type AggregatorTimeframe,
    type ChartTimeframe,
    type LiveCandle,
} from '@ereuna/shared';
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';
import { symbolSchema } from '@/lib/schemas.js';
import { consumeTokenBucket, type TokenBucketOptions } from '@/lib/token-bucket.js';
import { readLastCandle, startMarketFeed, stopMarketFeed } from '@/gateway/market-feed.js';

type FeedSocket = Socket & {
    userId: string;
    candleRoom?: string; // The one candle room this socket is in, so switching charts can leave it
    quoteRooms: string[]; // The quote rooms this socket is in, so a new watchlist can leave them all
};

const candleWatchSchema = z.object({
    symbol: symbolSchema,
    timeframe: z.enum(CHART_TIMEFRAMES),
});

const quoteWatchSchema = z.object({
    // Capped at what one portfolio can hold: the caller is a positions table,
    // and silently truncating its list would leave rows that never tick.
    symbols: z.array(symbolSchema).max(config.limits.positionsPerPortfolio),
});

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

/** The last price emitted per symbol, so an unchanged bucket is not re-sent. */
const lastPrices = new Map<string, number>();

let io: Server | undefined;

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

    io.use((socket: Socket, next) => {
        void (async () => {
            const { allowed } = await consumeTokenBucket(`rl:ws:conn:${clientIp(socket)}`, CONN_BUCKET);
            if (!allowed) return next(new Error('Too many connection attempts — slow down'));
            next();
        })();
    });

    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth?.token as string | undefined;
        if (token === undefined || token === '') return next(new Error('Missing token'));

        try {
            const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as { sub: string };
            const feed = socket as FeedSocket;
            feed.userId = payload.sub;
            feed.quoteRooms = [];
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const feed = socket as FeedSocket;
        socket.on('candle:watch', (payload: unknown) => void watchCandle(feed, payload));
        socket.on('quote:watch', (payload: unknown) => void watchQuotes(feed, payload));
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
    io.to(candleRoom(message.tickerID, message.timeframe)).emit('candle:update', {
        symbol: message.tickerID,
        timeframe,
        candle: formatCandle(message, timeframe),
    });

    if (message.timeframe !== QUOTE_TIMEFRAME) return;

    // Deduplicated per process rather than per socket: a bucket that closes
    // without a price change is the common case near the bell, and every
    // connected client would otherwise be woken for a value it already has.
    if (lastPrices.get(message.tickerID) === message.close) return;
    lastPrices.set(message.tickerID, message.close);
    io.to(quoteRoom(message.tickerID)).emit('quote:update', { quotes: { [message.tickerID]: message.close } });
}

async function watchCandle(socket: FeedSocket, payload: unknown): Promise<void> {
    const parsed = candleWatchSchema.safeParse(payload);
    if (!parsed.success || !(await allowWatch(socket))) return;

    const { symbol, timeframe } = parsed.data;
    const bucket = CHART_TO_AGGREGATOR[timeframe];
    const room = candleRoom(symbol, bucket);

    if (socket.candleRoom === room) return;
    if (socket.candleRoom !== undefined) await socket.leave(socket.candleRoom);
    await socket.join(room);
    socket.candleRoom = room;

    // A chart opened mid-bucket should not stare at an empty last bar until the
    // next trade, so the bucket as it stands right now is sent immediately.
    const opening = await readLastCandle(symbol, bucket);
    if (opening !== null && socket.candleRoom === room) {
        socket.emit('candle:update', { symbol, timeframe, candle: formatCandle(opening, timeframe) });
    }
}

async function watchQuotes(socket: FeedSocket, payload: unknown): Promise<void> {
    const parsed = quoteWatchSchema.safeParse(payload);
    if (!parsed.success || !(await allowWatch(socket))) return;

    const symbols = [...new Set(parsed.data.symbols)];
    // join/leave are synchronous on the in-memory adapter, which is the only one
    // this gateway uses — see the note on why there is no Redis adapter.
    for (const room of socket.quoteRooms) void socket.leave(room);
    socket.quoteRooms = symbols.map(quoteRoom);
    for (const room of socket.quoteRooms) void socket.join(room);

    const quotes: Record<string, number> = {};
    for (const symbol of symbols) {
        const opening = await readLastCandle(symbol, QUOTE_TIMEFRAME);
        if (opening !== null) quotes[symbol] = opening.close;
    }
    if (Object.keys(quotes).length > 0) socket.emit('quote:update', { quotes });
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

/** Spend one subscription-change token for this socket's user. */
async function allowWatch(socket: FeedSocket): Promise<boolean> {
    const { allowed } = await consumeTokenBucket(`rl:ws:watch:${socket.userId}`, WATCH_BUCKET);
    if (!allowed) logger.warn({ userId: socket.userId }, 'Socket subscription rate limit hit');
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
function clientIp(socket: Socket): string {
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
