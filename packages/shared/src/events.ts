/**
 * The socket half of the contract: every event that crosses the live market
 * feed, with the schema its payload is held to. The gateway pushes only through
 * these schemas, so a payload is checked and trimmed exactly like a REST answer,
 * and parses every inbound event with them; the frontend's socket is typed from
 * the same table, so a listener cannot expect a field the server never pushes
 * and an emit cannot send one the gateway refuses.
 */
import { z } from 'zod';

import { CHART_TIMEFRAMES } from '#db/collections.js';
import { LIMITS } from '#limits.js';
import { symbolField } from '#requests/fields.js';

/**
 * One bucket as it reaches the browser. `time` matches the REST series exactly
 * or the client cannot address the same bar: an intraday bar is the UTC instant
 * to the second, a daily or weekly bar is the calendar date alone.
 */
const liveCandleSchema = z.object({
    time: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
    final: z.boolean(), // True once the bucket has closed and will not change again
});

export type LiveCandle = z.output<typeof liveCandleSchema>;

/**
 * One symbol's last price, with its change since the previous session's close
 * worked out by the server, as a quote vendor's snapshot carries it. The page
 * only displays it: it holds no reference price of its own that could be a
 * session older than the one trading. `changePercent` is null for a symbol
 * with no earlier bar to compare against.
 */
const liveQuoteSchema = z.object({
    price: z.number(),
    changePercent: z.number().nullable(),
});

export type LiveQuote = z.output<typeof liveQuoteSchema>;

const candlePairSchema = z.object({ symbol: symbolField, timeframe: z.enum(CHART_TIMEFRAMES) });

/** One chart's live subscription, as a client asks for it. */
export type CandlePair = z.input<typeof candlePairSchema>;

export type ServerEvent = keyof typeof SERVER_EVENTS;

type ClientEvent = keyof typeof CLIENT_EVENTS;

/** The payload of a server event, as a client receives it. */
export type EventPayload<TEvent extends ServerEvent> = z.output<(typeof SERVER_EVENTS)[TEvent]>;

/** What a client sends with an inbound event, before the gateway parses it. */
type ClientPayload<TEvent extends ClientEvent> = z.input<(typeof CLIENT_EVENTS)[TEvent]>;

/** Socket.IO's typed-events map for what the server pushes: `Socket<ServerToClientEvents>`. */
export type ServerToClientEvents = { [TEvent in ServerEvent]: (payload: EventPayload<TEvent>) => void };

/** Socket.IO's typed-events map for what a client sends. */
export type ClientToServerEvents = { [TEvent in ClientEvent]: (payload: ClientPayload<TEvent>) => void };

/**
 * The most charts one connection may have live at once. A page charts at most
 * two (the screener's daily over weekly); the rest is headroom, not a feature.
 */
const MAX_LIVE_CHARTS = 4;

export const SERVER_EVENTS = {
    /** The bucket this socket watches, each time a trade moves it. */
    'candle:update': z.object({
        symbol: z.string(),
        timeframe: z.enum(CHART_TIMEFRAMES),
        candle: liveCandleSchema,
    }),
    /** A partial symbol → quote map: only what moved since the last push. */
    'quote:update': z.object({ quotes: z.record(z.string(), liveQuoteSchema) }),
} as const;

export const CLIENT_EVENTS = {
    /** Replaces this socket's candle subscriptions with every pair its open charts show. */
    'candle:watch': z.object({ pairs: z.array(candlePairSchema).max(MAX_LIVE_CHARTS) }),
    /**
     * Replaces this socket's quote subscriptions. Capped at the larger of what
     * one portfolio or one watchlist can hold: the caller is a positions table
     * or a watchlist, and refusing its list would leave every row still.
     */
    'quote:watch': z.object({
        symbols: z.array(symbolField).max(Math.max(LIMITS.positionsPerPortfolio, LIMITS.tickersPerWatchlist)),
    }),
} as const;
