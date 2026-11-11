/**
 * A stand-in for Tiingo's trade websocket, so the whole pipeline runs without
 * a vendor key. It speaks the protocol as the vendor documents it: a subscribe
 * acknowledged with a subscription id, a heartbeat every 30 seconds, `A` price
 * frames on the 24x5 consolidated service, and an unsubscribe answered with the
 * tickers still subscribed.
 * Trades are printed from the simulated market for the symbols each connection
 * subscribed to. Like the real feed it keeps printing outside regular hours, at
 * a trickle, because cutting the session at the bell is the ingestor's job.
 * The `authorization` field is checked for presence only and never logged:
 * the ingestor sends whatever key it holds.
 * Dev only. It serves plain `ws://`, which the ingestor refuses in production.
 */
import { type RawData, type WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';

import { TIINGO_SERVICE } from '@ereuna/shared';

import { logger } from '@/lib/logger.js';
import {
    type Market,
    nextPrice,
    pickSymbol,
    type Random,
    sessionIntensity,
    toPrintedPrice,
    toVendorInstant,
    tradesInTick,
} from '@/simulator/traffic.js';

type VendorOptions = {
    port: number;
    market: Market;
    tradesPerSecond: number;
    random: Random;
    now: () => number;
};

type Vendor = {
    port: number;
    close: () => Promise<void>;
};

type Subscription = { id: number; tickers: Set<string> };

const requestSchema = z.object({
    eventName: z.enum(['subscribe', 'unsubscribe']),
    authorization: z.string().min(1),
    eventData: z.object({ tickers: z.array(z.string()).default([]) }),
});

/** The port `npm run ingestor:sim` points the ingestor at. */
export const SIMULATOR_PORT = 8787;

const TICK_MS = 100;
const HEARTBEAT_MS = 30_000;
const SUMMARY_MS = 60_000;

const HEARTBEAT = JSON.stringify({ messageType: 'H', response: { code: 200, message: 'HeartBeat' } });
const REFUSED = JSON.stringify({ messageType: 'E', response: { code: 400, message: 'Invalid request' } });

/** Listen on `port` (0 for any free one) and resolve once the socket is bound. */
export function startVendor(options: VendorOptions): Promise<Vendor> {
    const server = new WebSocketServer({ port: options.port });
    const subscriptions = new Map<WebSocket, Subscription>();
    let lastId = 0;
    let printed = 0;

    server.on('connection', (socket) => {
        const heartbeat = setInterval(() => {
            socket.send(HEARTBEAT);
        }, HEARTBEAT_MS);
        socket.on('message', (data) => {
            lastId = answer(socket, data, subscriptions, lastId);
        });
        socket.on('error', (err) => {
            logger.warn({ err }, 'Simulated feed client socket error');
        });
        socket.on('close', () => {
            clearInterval(heartbeat);
            subscriptions.delete(socket);
        });
    });

    const tick = setInterval(() => {
        printed += printTrades(options, subscriptions);
    }, TICK_MS);

    const summary = setInterval(() => {
        logger.info(
            { trades: printed, subscribers: subscriptions.size },
            'Simulated trades printed in the last minute',
        );
        printed = 0;
    }, SUMMARY_MS);

    function close(): Promise<void> {
        clearInterval(tick);
        clearInterval(summary);
        for (const client of server.clients) client.terminate();
        return new Promise((resolve, reject): void => {
            server.close((err) => {
                if (err === undefined) resolve();
                else reject(err);
            });
        });
    }

    return new Promise((resolve, reject): void => {
        server.once('error', reject);
        server.once('listening', () => {
            server.off('error', reject);
            server.on('error', (err) => {
                logger.error({ err }, 'Simulated feed server error');
            });
            const address = server.address();
            resolve({ port: address !== null && typeof address === 'object' ? address.port : options.port, close });
        });
    });
}

/** Answer one client frame and give back the last subscription id handed out. */
function answer(socket: WebSocket, data: RawData, subscriptions: Map<WebSocket, Subscription>, lastId: number): number {
    const request = readRequest(data);
    if (request === null) {
        socket.send(REFUSED);
        return lastId;
    }

    const tickers = request.eventData.tickers.map((ticker) => ticker.toUpperCase());
    const current = subscriptions.get(socket);

    if (request.eventName === 'unsubscribe') {
        for (const ticker of tickers) current?.tickers.delete(ticker);
        socket.send(
            JSON.stringify({
                messageType: 'I',
                data: { tickers: [...(current?.tickers ?? [])], thresholdLevel: '6' },
                response: { code: 200, message: 'Success' },
            }),
        );
        return lastId;
    }

    const subscription = current ?? { id: lastId + 1, tickers: new Set<string>() };
    for (const ticker of tickers) subscription.tickers.add(ticker);
    subscriptions.set(socket, subscription);
    socket.send(
        JSON.stringify({
            messageType: 'I',
            data: { subscriptionId: subscription.id },
            response: { code: 200, message: 'Success' },
        }),
    );
    return subscription.id;
}

/** Print one tick's trades to every connection subscribed to them, and count them. */
function printTrades(options: VendorOptions, subscriptions: Map<WebSocket, Subscription>): number {
    const at = options.now();
    const count = tradesInTick(options.tradesPerSecond, TICK_MS, sessionIntensity(new Date(at)), options.random);
    let sent = 0;

    for (let i = 0; i < count; i++) {
        const symbol = pickSymbol(options.market, options.random);
        if (symbol === null) return sent;
        symbol.price = nextPrice(symbol, options.random);

        const frame = JSON.stringify({
            messageType: 'A',
            service: TIINGO_SERVICE,
            data: [toVendorInstant(at, options.random), symbol.symbol.toLowerCase(), toPrintedPrice(symbol.price)],
        });
        for (const [socket, subscription] of subscriptions) {
            if (!subscription.tickers.has(symbol.symbol)) continue;
            socket.send(frame);
            sent++;
        }
    }

    return sent;
}

function readRequest(data: RawData): z.infer<typeof requestSchema> | null {
    try {
        const parsed = requestSchema.safeParse(JSON.parse(rawText(data)));
        return parsed.success ? parsed.data : null;
    } catch {
        // Not JSON: refused the same as JSON of the wrong shape
        return null;
    }
}

function rawText(data: RawData): string {
    if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
    if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
    return data.toString('utf8');
}
