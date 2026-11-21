import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AGGREGATE_CHANNEL_PATTERN } from '@ereuna/shared';

import type { BucketSink } from '@/gateway/market-feed.js';

type Handler = (...args: unknown[]) => void;

/** A stand-in for the dedicated subscriber connection `startMarketFeed` opens. */
class FakeSubscriber {
    static last: FakeSubscriber | undefined;
    readonly handlers = new Map<string, Handler>();
    readonly options: unknown;
    disconnected = 0;
    quits = 0;
    subscribeError: Error | null = null;
    patterns: string[] = [];

    constructor(options: unknown) {
        this.options = options;
        this.subscribeError = state.subscribeError;
        FakeSubscriber.last = this;
    }

    on(event: string, handler: Handler): this {
        this.handlers.set(event, handler);
        return this;
    }

    psubscribe(pattern: string): Promise<void> {
        if (this.subscribeError !== null) return Promise.reject(this.subscribeError);
        this.patterns.push(pattern);
        return Promise.resolve();
    }

    disconnect(): void {
        this.disconnected += 1;
    }

    quit(): Promise<string> {
        this.quits += 1;
        return Promise.resolve('OK');
    }

    emit(event: string, ...args: unknown[]): void {
        this.handlers.get(event)?.(...args);
    }
}

vi.mock('ioredis', () => ({ Redis: FakeSubscriber }));
const state: { subscribeError: Error | null } = { subscribeError: null };

const logs: { level: string; message: string }[] = [];
vi.mock('@/lib/logger.js', () => ({
    logger: {
        info: (_ctx: unknown, message: string) => logs.push({ level: 'info', message }),
        warn: (_ctx: unknown, message: string) => logs.push({ level: 'warn', message }),
        error: (_ctx: unknown, message: string) => logs.push({ level: 'error', message }),
        debug: () => {},
    },
}));

const { startMarketFeed, stopMarketFeed } = await import('@/gateway/market-feed.js');

const bucket = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    tickerID: 'aapl',
    timeframe: '1m',
    timestamp: '2026-03-02T14:30:00',
    open: 1,
    high: 2,
    low: 0.5,
    close: 1.5,
    volume: 100,
    ...over,
});

const subscriber = (): FakeSubscriber => {
    if (FakeSubscriber.last === undefined) throw new Error('no subscriber was opened');
    return FakeSubscriber.last;
};

beforeEach(() => {
    state.subscribeError = null;
    logs.length = 0;
    FakeSubscriber.last = undefined;
});

afterEach(async () => {
    await stopMarketFeed();
});

describe('startMarketFeed', () => {
    it('holds one pattern subscription for the whole process', async () => {
        await startMarketFeed(() => {});

        expect(subscriber().patterns).toEqual([AGGREGATE_CHANNEL_PATTERN]);
    });

    it('opens its own connection, because a subscriber may not issue ordinary commands', async () => {
        await startMarketFeed(() => {});

        expect(subscriber().options).toMatchObject({ maxRetriesPerRequest: null });
    });

    it('does not throw when the subscribe fails — history serves either way', async () => {
        state.subscribeError = new Error('connection refused');

        await expect(startMarketFeed(() => {})).resolves.toBeUndefined();
        expect(subscriber().disconnected).toBe(1);
        expect(logs.some((line) => line.level === 'error')).toBe(true);
    });

    it('logs a connection error rather than letting it reach the process', async () => {
        await startMarketFeed(() => {});
        subscriber().emit('error', new Error('reset by peer'));

        expect(logs).toContainEqual({ level: 'error', message: 'Market feed subscriber error' });
    });

    it('hands each published bucket to the sink', async () => {
        const sink = vi.fn<BucketSink>();
        await startMarketFeed(sink);
        subscriber().emit('pmessage', 'aggr:*', 'aggr:1m', JSON.stringify(bucket()));

        expect(sink).toHaveBeenCalledTimes(1);
        expect(sink.mock.calls[0]?.[0]).toMatchObject({ tickerID: 'AAPL', timeframe: '1m' });
    });

    it('states the zone on a naive timestamp, rather than shifting the bar by the server offset', async () => {
        const sink = vi.fn<BucketSink>();
        await startMarketFeed(sink);
        subscriber().emit('pmessage', 'aggr:*', 'aggr:1m', JSON.stringify(bucket()));

        expect(sink.mock.calls[0]?.[0].timestamp).toBe('2026-03-02T14:30:00.000Z');
    });

    it('accepts a timestamp that already carries a zone', async () => {
        const sink = vi.fn<BucketSink>();
        await startMarketFeed(sink);
        subscriber().emit(
            'pmessage',
            'aggr:*',
            'aggr:1m',
            JSON.stringify(bucket({ timestamp: '2026-03-02T09:30:00-05:00' })),
        );

        expect(sink.mock.calls[0]?.[0].timestamp).toBe('2026-03-02T14:30:00.000Z');
    });

    it('reads `start` when the producer did not write `timestamp`', async () => {
        const sink = vi.fn<BucketSink>();
        await startMarketFeed(sink);
        const { timestamp: _timestamp, ...rest } = bucket();
        subscriber().emit('pmessage', 'aggr:*', 'aggr:1m', JSON.stringify({ ...rest, start: '2026-03-02T14:30:00Z' }));

        expect(sink).toHaveBeenCalledTimes(1);
    });

    it('defaults a missing or non-finite volume to zero, and final to false', async () => {
        const sink = vi.fn<BucketSink>();
        await startMarketFeed(sink);
        subscriber().emit('pmessage', 'aggr:*', 'aggr:1m', JSON.stringify(bucket({ volume: undefined })));

        expect(sink.mock.calls[0]?.[0]).toMatchObject({ volume: 0, final: false });
    });

    it.each([
        ['not JSON at all', 'nonsense'],
        ['a JSON scalar', '42'],
        ['a JSON null', 'null'],
        ['no symbol', JSON.stringify(bucket({ tickerID: '' }))],
        ['a timeframe the aggregator does not produce', JSON.stringify(bucket({ timeframe: '3m' }))],
        ['a non-string timestamp', JSON.stringify(bucket({ timestamp: 1700000000 }))],
        ['an unparseable timestamp', JSON.stringify(bucket({ timestamp: 'nonsense' }))],
        ['a non-numeric price', JSON.stringify(bucket({ close: 'n/a' }))],
        ['an infinite price', JSON.stringify(bucket({ high: null }))],
    ])('drops a payload with %s', async (_case, payload) => {
        const sink = vi.fn<BucketSink>();
        await startMarketFeed(sink);
        subscriber().emit('pmessage', 'aggr:*', 'aggr:1m', payload);

        expect(sink).not.toHaveBeenCalled();
    });
});

describe('stopMarketFeed', () => {
    it('quits the subscriber connection', async () => {
        await startMarketFeed(() => {});
        const client = subscriber();
        await stopMarketFeed();

        expect(client.quits).toBe(1);
    });

    it('is a no-op when nothing was subscribed', async () => {
        await expect(stopMarketFeed()).resolves.toBeUndefined();
    });

    it('does not quit twice', async () => {
        await startMarketFeed(() => {});
        const client = subscriber();
        await stopMarketFeed();
        await stopMarketFeed();

        expect(client.quits).toBe(1);
    });
});
