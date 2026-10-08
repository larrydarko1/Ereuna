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

export const SERVER_EVENTS = {
    /** The bucket this socket watches, each time a trade moves it. */
    'candle:update': z.object({
        symbol: z.string(),
        timeframe: z.enum(CHART_TIMEFRAMES),
        candle: liveCandleSchema,
    }),
    /** A partial symbol → last price map: only what moved since the last push. */
    'quote:update': z.object({ quotes: z.record(z.string(), z.number()) }),
} as const;

export const CLIENT_EVENTS = {
    /** Replaces this socket's candle subscription. */
    'candle:watch': z.object({ symbol: symbolField, timeframe: z.enum(CHART_TIMEFRAMES) }),
    /**
     * Replaces this socket's quote subscriptions. Capped at what one portfolio
     * can hold: the caller is a positions table, and silently truncating its
     * list would leave rows that never tick.
     */
    'quote:watch': z.object({ symbols: z.array(symbolField).max(LIMITS.positionsPerPortfolio) }),
} as const;
