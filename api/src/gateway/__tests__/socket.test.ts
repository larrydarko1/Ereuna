import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import { io as connect, type Socket as ClientSocket } from 'socket.io-client';
import { QUOTE_TIMEFRAME, type AggregateMessage } from '@ereuna/shared';

type Sink = (message: AggregateMessage) => void;

const feed: { sink: Sink | null; last: Map<string, AggregateMessage>; stopped: number } = {
    sink: null,
    last: new Map(),
    stopped: 0,
};

const buckets: { allowed: boolean; keys: string[] } = { allowed: true, keys: [] };
const logs: string[] = [];

vi.mock('@/gateway/market-feed.js', () => ({
    startMarketFeed: (sink: Sink) => {
        feed.sink = sink;
        return Promise.resolve();
    },
    stopMarketFeed: () => {
        feed.stopped += 1;
        return Promise.resolve();
    },
    readLastCandle: (symbol: string, timeframe: string) =>
        Promise.resolve(feed.last.get(`${symbol}:${timeframe}`) ?? null),
}));
vi.mock('@/lib/token-bucket.js', () => ({
    consumeTokenBucket: (key: string) => {
        buckets.keys.push(key);
        return Promise.resolve({ allowed: buckets.allowed, remaining: 0, retryAfterMs: 0 });
    },
}));
vi.mock('@/lib/logger.js', () => ({
    logger: {
        info: () => {},
        debug: () => {},
        warn: (_ctx: unknown, message: string) => logs.push(message),
        error: (_ctx: unknown, message: string) => logs.push(message),
    },
}));

const { closeSocket, initSocket } = await import('@/gateway/socket.js');
const { config } = await import('@/lib/config.js');

const token = (userId = '507f1f77bcf86cd799439011'): string =>
    jwt.sign({ sub: userId }, config.jwt.secret, { algorithm: 'HS256', expiresIn: '15m' });

const message = (over: Partial<AggregateMessage> = {}): AggregateMessage => ({
    tickerID: 'AAPL',
    timeframe: QUOTE_TIMEFRAME,
    timestamp: '2026-03-02T14:30:00.000Z',
    open: 1,
    high: 2,
    low: 0.5,
    close: 1.5,
    volume: 100,
    final: false,
    ...over,
});

let server: HttpServer;
let url: string;
const clients: ClientSocket[] = [];

/** Open a client and wait for it to connect, or for the server to refuse it. */
async function client(options: Parameters<typeof connect>[1] = {}): Promise<ClientSocket> {
    const socket = connect(url, { transports: ['websocket'], auth: { token: token() }, ...options });
    clients.push(socket);
    await new Promise<void>((resolve) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', () => resolve());
    });
    return socket;
}

/** The next payload of `event`, or null when nothing arrives in time. */
function next<T>(socket: ClientSocket, event: string, ms = 200): Promise<T | null> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), ms);
        socket.once(event, (payload: T) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });
}

beforeEach(async () => {
    feed.sink = null;
    feed.last = new Map();
    feed.stopped = 0;
    buckets.allowed = true;
    buckets.keys = [];
    logs.length = 0;

    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    await initSocket(server);
});

afterEach(async () => {
    for (const socket of clients.splice(0)) socket.disconnect();
    await closeSocket();
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('the handshake', () => {
    it('accepts a valid access token', async () => {
        const socket = await client();

        expect(socket.connected).toBe(true);
    });

    it('refuses a connection with no token', async () => {
        const socket = await client({ auth: {} });

        expect(socket.connected).toBe(false);
    });

    it('refuses an empty token', async () => {
        const socket = await client({ auth: { token: '' } });

        expect(socket.connected).toBe(false);
    });

    it('refuses a token signed with another secret', async () => {
        const forged = jwt.sign({ sub: '507f1f77bcf86cd799439011' }, 'not-the-secret', { algorithm: 'HS256' });
        const socket = await client({ auth: { token: forged } });

        expect(socket.connected).toBe(false);
    });

    it('refuses an expired token', async () => {
        const stale = jwt.sign({ sub: '507f1f77bcf86cd799439011' }, config.jwt.secret, {
            algorithm: 'HS256',
            expiresIn: -60,
        });
        const socket = await client({ auth: { token: stale } });

        expect(socket.connected).toBe(false);
    });

    it('rate limits the handshake per client address, before any token is verified', async () => {
        buckets.allowed = false;
        const socket = await client();

        expect(socket.connected).toBe(false);
        expect(buckets.keys[0]).toMatch(/^rl:ws:conn:/);
    });

    it('refuses an upgrade from another origin — CORS does not govern upgrades', async () => {
        const socket = await client({ extraHeaders: { origin: 'https://evil.example' } });

        expect(socket.connected).toBe(false);
    });

    it('accepts the app origin', async () => {
        const socket = await client({ extraHeaders: { origin: config.corsOrigin } });

        expect(socket.connected).toBe(true);
    });
});

describe('candle:watch', () => {
    it('delivers the bucket the aggregator publishes for the watched pair', async () => {
        const socket = await client();
        socket.emit('candle:watch', { symbol: 'aapl', timeframe: 'daily' });
        await next(socket, 'candle:update');

        feed.sink?.(message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z' }));
        const update = await next<{ symbol: string; timeframe: string; candle: { time: string } }>(
            socket,
            'candle:update',
        );

        expect(update).toMatchObject({ symbol: 'AAPL', timeframe: 'daily' });
        expect(update?.candle.time).toBe('2026-03-02');
    });

    it('stamps an intraday bar to the second, the way the REST bars do', async () => {
        const socket = await client();
        socket.emit('candle:watch', { symbol: 'AAPL', timeframe: 'intraday1m' });
        await next(socket, 'candle:update');

        feed.sink?.(message());
        const update = await next<{ candle: { time: string; final: boolean } }>(socket, 'candle:update');

        expect(update?.candle.time).toBe('2026-03-02T14:30:00');
        expect(update?.candle.final).toBe(false);
    });

    it('sends the half-built bucket immediately, so a chart is not blank until the next trade', async () => {
        feed.last.set('AAPL:1d', message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z', close: 9 }));
        const socket = await client();
        socket.emit('candle:watch', { symbol: 'AAPL', timeframe: 'daily' });

        const update = await next<{ candle: { close: number } }>(socket, 'candle:update');

        expect(update?.candle.close).toBe(9);
    });

    it('leaves the previous room, so an old chart stops ticking', async () => {
        const socket = await client();
        socket.emit('candle:watch', { symbol: 'AAPL', timeframe: 'daily' });
        await next(socket, 'candle:update');
        socket.emit('candle:watch', { symbol: 'MSFT', timeframe: 'daily' });
        await next(socket, 'candle:update');

        feed.sink?.(message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z' }));

        expect(await next(socket, 'candle:update')).toBeNull();
    });

    it('ignores a re-watch of the pair it already holds', async () => {
        feed.last.set('AAPL:1d', message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z' }));
        const socket = await client();
        socket.emit('candle:watch', { symbol: 'AAPL', timeframe: 'daily' });
        expect(await next(socket, 'candle:update')).not.toBeNull();

        socket.emit('candle:watch', { symbol: 'AAPL', timeframe: 'daily' });

        expect(await next(socket, 'candle:update')).toBeNull();
    });

    it('ignores a payload that is not a watch', async () => {
        const socket = await client();
        socket.emit('candle:watch', { symbol: 'AAPL', timeframe: 'yearly' });

        feed.sink?.(message({ timeframe: '1d' }));

        expect(await next(socket, 'candle:update')).toBeNull();
    });

    it('rate limits subscription changes per user', async () => {
        feed.last.set('AAPL:1d', message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z' }));
        const socket = await client();
        buckets.allowed = false;
        socket.emit('candle:watch', { symbol: 'AAPL', timeframe: 'daily' });

        expect(await next(socket, 'candle:update')).toBeNull();
        expect(buckets.keys.some((key) => key.startsWith('rl:ws:watch:'))).toBe(true);
        expect(logs).toContain('Socket subscription rate limit hit');
    });
});

describe('quote:watch', () => {
    it('answers immediately with whatever price each symbol already has', async () => {
        feed.last.set('AAPL:1m', message({ close: 180 }));
        feed.last.set('MSFT:1m', message({ tickerID: 'MSFT', close: 410 }));
        const socket = await client();
        socket.emit('quote:watch', { symbols: ['aapl', 'msft', 'nosuch'] });

        const update = await next<{ quotes: Record<string, number> }>(socket, 'quote:update');

        expect(update?.quotes).toEqual({ AAPL: 180, MSFT: 410 });
    });

    it('sends nothing when none of the symbols has a live bucket', async () => {
        const socket = await client();
        socket.emit('quote:watch', { symbols: ['AAPL'] });

        expect(await next(socket, 'quote:update')).toBeNull();
    });

    it('delivers a price change on a watched symbol', async () => {
        const socket = await client();
        socket.emit('quote:watch', { symbols: ['AAPL'] });
        await next(socket, 'quote:update');

        feed.sink?.(message({ close: 181 }));

        expect(await next(socket, 'quote:update')).toEqual({ quotes: { AAPL: 181 } });
    });

    it('does not re-send an unchanged price', async () => {
        const socket = await client();
        socket.emit('quote:watch', { symbols: ['AAPL'] });
        await next(socket, 'quote:update');

        feed.sink?.(message({ close: 181 }));
        await next(socket, 'quote:update');
        feed.sink?.(message({ close: 181 }));

        expect(await next(socket, 'quote:update')).toBeNull();
    });

    it('publishes no quote for a timeframe that is not the quote bucket', async () => {
        const socket = await client();
        socket.emit('quote:watch', { symbols: ['AAPL'] });
        await next(socket, 'quote:update');

        feed.sink?.(message({ timeframe: '5m', close: 181 }));

        expect(await next(socket, 'quote:update')).toBeNull();
    });

    it('replaces the previous watch rather than adding to it', async () => {
        const socket = await client();
        socket.emit('quote:watch', { symbols: ['AAPL'] });
        await next(socket, 'quote:update');
        socket.emit('quote:watch', { symbols: ['MSFT'] });
        await next(socket, 'quote:update');

        feed.sink?.(message({ close: 181 }));

        expect(await next(socket, 'quote:update')).toBeNull();
    });

    it('refuses a list longer than one portfolio can hold', async () => {
        feed.last.set('AAPL:1m', message());
        const socket = await client();
        const symbols = Array.from({ length: config.limits.positionsPerPortfolio + 1 }, (_, i) => `S${i}`);
        socket.emit('quote:watch', { symbols: [...symbols, 'AAPL'] });

        expect(await next(socket, 'quote:update')).toBeNull();
    });

    it('deduplicates the list before it joins rooms', async () => {
        feed.last.set('AAPL:1m', message({ close: 180 }));
        const socket = await client();
        socket.emit('quote:watch', { symbols: ['AAPL', 'aapl'] });

        expect(await next(socket, 'quote:update')).toEqual({ quotes: { AAPL: 180 } });
    });
});

describe('closeSocket', () => {
    it('stops the feed and forgets the deduplication state', async () => {
        const socket = await client();
        socket.emit('quote:watch', { symbols: ['AAPL'] });
        await next(socket, 'quote:update');
        feed.sink?.(message({ close: 181 }));
        await next(socket, 'quote:update');

        await closeSocket();

        expect(feed.stopped).toBe(1);
    });

    it('is safe to call when nothing is open', async () => {
        await closeSocket();

        await expect(closeSocket()).resolves.toBeUndefined();
    });

    it('drops a bucket published after the server is closed', async () => {
        const sink = feed.sink;
        await closeSocket();

        expect(() => sink?.(message())).not.toThrow();
    });
});
