import { createServer, type Server as HttpServer } from 'node:http';

import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { io as connect, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QUOTE_TIMEFRAME, type AggregateMessage, type PositionDoc } from '@ereuna/shared';

import { portOf } from '@/__tests__/support/port.js';
import type { Holdings } from '@/services/portfolio/index.js';

type Sink = (message: AggregateMessage) => void;

const feed: { sink: Sink | null; last: Map<string, AggregateMessage>; stopped: number } = {
    sink: null,
    last: new Map(),
    stopped: 0,
};

vi.mock('@/gateway/market-feed.js', () => ({
    startMarketFeed: (sink: Sink) => {
        feed.sink = sink;
        return Promise.resolve();
    },
    stopMarketFeed: () => {
        feed.stopped += 1;
        return Promise.resolve();
    },
}));
vi.mock('@/lib/last-bucket.js', () => ({
    readLastCandle: (symbol: string, timeframe: string) =>
        Promise.resolve(feed.last.get(`${symbol}:${timeframe}`) ?? null),
}));
const closes: {
    bySymbol: Map<string, number>;
    reads: { symbols: string[]; before: Date | undefined }[];
    fail: boolean;
} = { bySymbol: new Map(), reads: [], fail: false };
vi.mock('@/services/market/index.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/services/market/index.js')>()),
    latestCloses: (symbols: readonly string[], options: { before?: Date } = {}) => {
        closes.reads.push({ symbols: [...symbols], before: options.before });
        if (closes.fail) return Promise.reject(new Error('not primary'));
        return Promise.resolve(new Map([...closes.bySymbol].filter(([symbol]) => symbols.includes(symbol))));
    },
}));
const portfolios: { held: Holdings | null; reads: { userId: string; number: number }[]; fail: boolean } = {
    held: null,
    reads: [],
    fail: false,
};
vi.mock('@/services/portfolio/index.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/services/portfolio/index.js')>()),
    findHoldings: (userId: ObjectId, number: number) => {
        portfolios.reads.push({ userId: userId.toHexString(), number });
        if (portfolios.fail) return Promise.reject(new Error('not primary'));
        return Promise.resolve(portfolios.held);
    },
}));
const buckets: { allowed: boolean; keys: string[] } = { allowed: true, keys: [] };

vi.mock('@/lib/token-bucket.js', () => ({
    consumeTokenBucket: (key: string) => {
        buckets.keys.push(key);
        return Promise.resolve({ allowed: buckets.allowed, remaining: 0, retryAfterMs: 0 });
    },
}));
const logs: string[] = [];
const { closeSocket, initSocket } = await import('@/gateway/socket.js');

const { config } = await import('@/lib/config.js');
let server: HttpServer;

let url: string;

const clients: ClientSocket[] = [];

const USER = '507f1f77bcf86cd799439011';

const token = (userId = USER): string =>
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
vi.mock('@/lib/logger.js', () => ({
    logger: {
        info: () => {},
        debug: () => {},
        warn: (_ctx: unknown, message: string) => logs.push(message),
        error: (_ctx: unknown, message: string) => logs.push(message),
    },
}));

const held = (symbol: string, over: Partial<PositionDoc> = {}): PositionDoc => ({
    userId: new ObjectId(USER),
    portfolioNumber: 2,
    symbol,
    side: 'long',
    shares: 10,
    avgPrice: 100,
    updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    ...over,
});

/** AAPL and MSFT held in slot 2, both closing yesterday at 150. */
const holdings = (): Holdings => ({
    portfolio: { number: 2, cash: 1_000, baseValue: 0, leverage: 1 },
    positions: [held('AAPL'), held('MSFT')],
    closes: new Map([
        ['AAPL', 150],
        ['MSFT', 150],
    ]),
});

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
    // Only the clock: the server and the client still need real timers. The
    // trading day is the one the fixture buckets are stamped on
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-02T14:31:00.000Z'));
    closes.bySymbol = new Map([['AAPL', 150]]);
    closes.reads = [];
    closes.fail = false;
    feed.sink = null;
    feed.last = new Map();
    feed.stopped = 0;
    portfolios.held = holdings();
    portfolios.reads = [];
    portfolios.fail = false;
    buckets.allowed = true;
    buckets.keys = [];
    logs.length = 0;

    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    url = `http://127.0.0.1:${portOf(server)}`;
    await initSocket(server);
});

afterEach(async () => {
    for (const socket of clients.splice(0)) socket.disconnect();
    await closeSocket();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.useRealTimers();
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
        socket.emit('candle:watch', { pairs: [{ symbol: 'aapl', timeframe: 'daily' }] });
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
        socket.emit('candle:watch', { pairs: [{ symbol: 'AAPL', timeframe: 'intraday1m' }] });
        await next(socket, 'candle:update');

        feed.sink?.(message());
        const update = await next<{ candle: { time: string; final: boolean } }>(socket, 'candle:update');

        expect(update?.candle.time).toBe('2026-03-02T14:30:00');
        expect(update?.candle.final).toBe(false);
    });

    it('sends the half-built bucket immediately, so a chart is not blank until the next trade', async () => {
        feed.last.set('AAPL:1d', message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z', close: 9 }));
        const socket = await client();
        socket.emit('candle:watch', { pairs: [{ symbol: 'AAPL', timeframe: 'daily' }] });

        const update = await next<{ candle: { close: number } }>(socket, 'candle:update');

        expect(update?.candle.close).toBe(9);
    });

    it('leaves the previous room, so an old chart stops ticking', async () => {
        const socket = await client();
        socket.emit('candle:watch', { pairs: [{ symbol: 'AAPL', timeframe: 'daily' }] });
        await next(socket, 'candle:update');
        socket.emit('candle:watch', { pairs: [{ symbol: 'MSFT', timeframe: 'daily' }] });
        await next(socket, 'candle:update');

        feed.sink?.(message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z' }));

        expect(await next(socket, 'candle:update')).toBeNull();
    });

    it('answers a pair it already holds again, so a chart switching onto it is not blank', async () => {
        feed.last.set('AAPL:1d', message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z' }));
        const socket = await client();
        socket.emit('candle:watch', { pairs: [{ symbol: 'AAPL', timeframe: 'daily' }] });
        expect(await next(socket, 'candle:update')).not.toBeNull();

        socket.emit('candle:watch', { pairs: [{ symbol: 'AAPL', timeframe: 'daily' }] });

        expect(await next(socket, 'candle:update')).not.toBeNull();
    });

    it('watches every pair in the set, so two charts on one page both tick', async () => {
        const socket = await client();
        socket.emit('candle:watch', {
            pairs: [
                { symbol: 'AAPL', timeframe: 'daily' },
                { symbol: 'AAPL', timeframe: 'weekly' },
            ],
        });
        await next(socket, 'candle:update');

        feed.sink?.(message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z' }));
        const daily = await next<{ timeframe: string }>(socket, 'candle:update');
        feed.sink?.(message({ timeframe: '1w', timestamp: '2026-03-02T00:00:00.000Z' }));
        const weekly = await next<{ timeframe: string }>(socket, 'candle:update');

        expect(daily?.timeframe).toBe('daily');
        expect(weekly?.timeframe).toBe('weekly');
    });

    it('leaves only the pairs the new set drops', async () => {
        const socket = await client();
        socket.emit('candle:watch', {
            pairs: [
                { symbol: 'AAPL', timeframe: 'daily' },
                { symbol: 'AAPL', timeframe: 'weekly' },
            ],
        });
        await next(socket, 'candle:update');
        socket.emit('candle:watch', { pairs: [{ symbol: 'AAPL', timeframe: 'weekly' }] });
        await next(socket, 'candle:update');

        feed.sink?.(message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z' }));
        expect(await next(socket, 'candle:update')).toBeNull();
        feed.sink?.(message({ timeframe: '1w', timestamp: '2026-03-02T00:00:00.000Z' }));
        expect(await next(socket, 'candle:update')).not.toBeNull();
    });

    it('leaves every room for an empty set', async () => {
        const socket = await client();
        socket.emit('candle:watch', { pairs: [{ symbol: 'AAPL', timeframe: 'daily' }] });
        await next(socket, 'candle:update');
        socket.emit('candle:watch', { pairs: [] });
        await next(socket, 'candle:update');

        feed.sink?.(message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z' }));

        expect(await next(socket, 'candle:update')).toBeNull();
    });

    it('refuses a set past the cap rather than watching part of it', async () => {
        const socket = await client();
        const symbols = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META'];
        socket.emit('candle:watch', { pairs: symbols.map((symbol) => ({ symbol, timeframe: 'daily' })) });

        feed.sink?.(message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z' }));

        expect(await next(socket, 'candle:update')).toBeNull();
    });

    it('ignores a payload that is not a watch', async () => {
        const socket = await client();
        socket.emit('candle:watch', { pairs: [{ symbol: 'AAPL', timeframe: 'yearly' }] });

        feed.sink?.(message({ timeframe: '1d' }));

        expect(await next(socket, 'candle:update')).toBeNull();
    });

    it('holds back a push its schema refuses, and logs why', async () => {
        const socket = await client();
        socket.emit('candle:watch', { pairs: [{ symbol: 'AAPL', timeframe: 'daily' }] });
        await next(socket, 'candle:update');

        // A price that is no number at all: the bucket the aggregator wrote is broken, not the socket
        feed.sink?.(message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z', close: Number.NaN }));

        expect(await next(socket, 'candle:update')).toBeNull();
        expect(logs).toContain('Socket payload did not match its schema; not sent');
    });

    it('rate limits subscription changes per user', async () => {
        feed.last.set('AAPL:1d', message({ timeframe: '1d', timestamp: '2026-03-02T00:00:00.000Z' }));
        const socket = await client();
        buckets.allowed = false;
        socket.emit('candle:watch', { pairs: [{ symbol: 'AAPL', timeframe: 'daily' }] });

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

        const update = await next<{ quotes: Record<string, unknown> }>(socket, 'quote:update');

        expect(update?.quotes).toEqual({
            AAPL: { price: 180, changePercent: 20 },
            MSFT: { price: 410, changePercent: null },
        });
    });

    it("measures the change from the newest close stamped before the bucket's trading day", async () => {
        const socket = await client();
        socket.emit('quote:watch', { symbols: ['AAPL'] });
        await next(socket, 'quote:update');

        expect(closes.reads).toEqual([{ symbols: ['AAPL'], before: new Date('2026-03-02T00:00:00.000Z') }]);
    });

    it('reads each previous close once per trading day, not once per watch', async () => {
        const socket = await client();
        socket.emit('quote:watch', { symbols: ['AAPL'] });
        await next(socket, 'quote:update');
        socket.emit('quote:watch', { symbols: ['AAPL', 'MSFT'] });
        await next(socket, 'quote:update');

        expect(closes.reads.map((read) => read.symbols)).toEqual([['AAPL'], ['MSFT']]);
    });

    it('still sends the price when the previous close cannot be read', async () => {
        closes.fail = true;
        feed.last.set('AAPL:1m', message({ close: 180 }));
        const socket = await client();
        socket.emit('quote:watch', { symbols: ['AAPL'] });

        expect(await next(socket, 'quote:update')).toEqual({ quotes: { AAPL: { price: 180, changePercent: null } } });
        expect(logs).toContain('Previous-close read failed; quotes go out without a change');
    });

    it('gives no change for a bucket from a day its reference was not read for', async () => {
        const socket = await client();
        socket.emit('quote:watch', { symbols: ['AAPL'] });
        await next(socket, 'quote:update');

        feed.sink?.(message({ close: 181, timestamp: '2026-03-03T14:30:00.000Z' }));

        expect(await next(socket, 'quote:update')).toEqual({ quotes: { AAPL: { price: 181, changePercent: null } } });
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

        expect(await next(socket, 'quote:update')).toEqual({ quotes: { AAPL: { price: 181, changePercent: 20.67 } } });
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

        expect(await next(socket, 'quote:update')).toEqual({ quotes: { AAPL: { price: 180, changePercent: 20 } } });
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

describe('portfolio:watch', () => {
    type Pushed = { number: number; totalValue: number; positions: { symbol: string; price: number; live: boolean }[] };

    it("answers at once with the socket owner's slot, priced at today's trades where there are any", async () => {
        feed.last.set('AAPL:1m', message({ close: 180 }));
        const socket = await client();
        socket.emit('portfolio:watch', { number: 2 });

        const update = await next<Pushed>(socket, 'portfolio:update');

        expect(portfolios.reads).toEqual([{ userId: USER, number: 2 }]);
        expect(update?.number).toBe(2);
        expect(update?.positions).toMatchObject([
            { symbol: 'AAPL', price: 180, live: true },
            { symbol: 'MSFT', price: 150, live: false },
        ]);
        expect(update?.totalValue).toBe(1_000 + 1_800 + 1_500);
    });

    it('prices a symbol whose newest bucket is from an earlier session at its close', async () => {
        feed.last.set('AAPL:1m', message({ close: 999, timestamp: '2026-02-27T20:59:00.000Z' }));
        const socket = await client();
        socket.emit('portfolio:watch', { number: 2 });

        const update = await next<Pushed>(socket, 'portfolio:update');

        expect(update?.positions[0]).toMatchObject({ symbol: 'AAPL', price: 150, live: false });
    });

    it('re-prices on a trade in a held symbol, one push for every trade in the second', async () => {
        const socket = await client();
        socket.emit('portfolio:watch', { number: 2 });
        await next(socket, 'portfolio:update');

        feed.sink?.(message({ close: 160 }));
        feed.sink?.(message({ tickerID: 'MSFT', close: 170 }));
        const update = await next<Pushed>(socket, 'portfolio:update', 1_500);

        expect(update?.positions).toMatchObject([
            { symbol: 'AAPL', price: 160, live: true },
            { symbol: 'MSFT', price: 170, live: true },
        ]);
        expect(await next(socket, 'portfolio:update', 1_200)).toBeNull();
    });

    it('stays quiet for a trade in a symbol the slot does not hold', async () => {
        const socket = await client();
        socket.emit('portfolio:watch', { number: 2 });
        await next(socket, 'portfolio:update');

        feed.sink?.(message({ tickerID: 'NVDA', close: 900 }));

        expect(await next(socket, 'portfolio:update', 1_200)).toBeNull();
    });

    it('stops when asked to watch nothing', async () => {
        const socket = await client();
        socket.emit('portfolio:watch', { number: 2 });
        await next(socket, 'portfolio:update');
        socket.emit('portfolio:watch', { number: null });
        await next(socket, 'portfolio:update', 50);

        feed.sink?.(message({ close: 160 }));

        expect(await next(socket, 'portfolio:update', 1_200)).toBeNull();
    });

    it('pushes nothing for a slot nobody has written to', async () => {
        portfolios.held = null;
        const socket = await client();
        socket.emit('portfolio:watch', { number: 5 });

        expect(await next(socket, 'portfolio:update')).toBeNull();
    });

    it('refuses a slot that does not exist', async () => {
        const socket = await client();
        socket.emit('portfolio:watch', { number: 10 });

        expect(await next(socket, 'portfolio:update')).toBeNull();
        expect(portfolios.reads).toEqual([]);
    });

    it('logs a failed read and pushes nothing, so the page keeps its summary', async () => {
        portfolios.fail = true;
        const socket = await client();
        socket.emit('portfolio:watch', { number: 2 });

        expect(await next(socket, 'portfolio:update')).toBeNull();
        expect(logs).toContain('Portfolio valuation read failed; the page keeps its summary');
    });

    it('rate limits it like any other subscription change', async () => {
        buckets.allowed = false;
        const socket = await client();
        socket.emit('portfolio:watch', { number: 2 });

        expect(await next(socket, 'portfolio:update')).toBeNull();
        expect(portfolios.reads).toEqual([]);
    });
});
