import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUCKET_MS, type AggregateMessage } from '@ereuna/shared';
import { fakeRedis, type RedisStub } from '@/__tests__/support/redis.js';

const redis: { current: RedisStub } = { current: fakeRedis() };
const logged: { warnings: unknown[] } = { warnings: [] };

vi.mock('@/lib/redis.js', () => ({ getPublisher: () => redis.current }));
vi.mock('@/lib/logger.js', () => ({
    logger: {
        warn: (payload: unknown): void => {
            logged.warnings.push(payload);
        },
        info: (): void => {},
        error: (): void => {},
        debug: (): void => {},
    },
}));

const { publishCandle } = await import('@/aggregate/publisher.js');

function message(overrides: Partial<AggregateMessage> = {}): AggregateMessage {
    return {
        tickerID: 'AAPL',
        timeframe: '1m',
        timestamp: '2026-09-04T15:30:00.000Z',
        open: 100,
        high: 101,
        low: 99,
        close: 100.5,
        volume: 1_000,
        ...overrides,
    };
}

/** Publishing is fire-and-forget, so the assertion has to wait for the microtask. */
const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
    redis.current = fakeRedis();
    logged.warnings = [];
});

describe('publishCandle', () => {
    it('publishes and sets the last-value key in one transaction', async () => {
        publishCandle(message());
        await settled();

        const [transaction] = redis.current.transactions;
        expect(transaction?.calls.map(([command]) => command)).toEqual(['publish', 'set']);
        expect(transaction?.exec).toHaveBeenCalledOnce();
    });

    it("publishes on the channel for the message's own timeframe", async () => {
        publishCandle(message({ timeframe: '1d' }));
        await settled();
        expect(redis.current.transactions[0]?.calls[0]?.[1][0]).toBe('aggr:1d');
    });

    it('keys the snapshot by symbol and timeframe, upper-cased', async () => {
        publishCandle(message({ tickerID: 'aapl' }));
        await settled();
        expect(redis.current.transactions[0]?.calls[1]?.[1][0]).toBe('aggr:last:AAPL:1m');
    });

    it('expires the snapshot at twice the bucket width, so a closed market cannot serve a stale bar', async () => {
        publishCandle(message({ timeframe: '5m' }));
        await settled();
        const [, , unit, ttl] = redis.current.transactions[0]?.calls[1]?.[1] ?? [];
        expect(unit).toBe('PX');
        expect(ttl).toBe(BUCKET_MS['5m'] * 2);
    });

    it('sends the same payload to both, so a late joiner sees what subscribers saw', async () => {
        const candle = message();
        publishCandle(candle);
        await settled();

        const transaction = redis.current.transactions[0];
        expect(transaction?.calls[0]?.[1][1]).toBe(JSON.stringify(candle));
        expect(transaction?.calls[1]?.[1][1]).toBe(JSON.stringify(candle));
    });

    it('returns before the write lands — the durable copy is the Mongo path', () => {
        expect(publishCandle(message())).toBeUndefined();
    });

    it('logs a failed publish and does not throw at the caller', async () => {
        redis.current.multi.mockImplementationOnce(() => {
            throw new Error('connection lost');
        });
        expect(() => publishCandle(message())).not.toThrow();
        await settled();
        expect(logged.warnings).toHaveLength(1);
    });

    it('logs a transaction that was rejected at exec', async () => {
        redis.current.multi.mockImplementationOnce(() => ({
            publish: function chain(): unknown {
                return this;
            },
            set: function chain(): unknown {
                return this;
            },
            exec: () => Promise.reject(new Error('READONLY')),
        }));
        publishCandle(message());
        await settled();
        expect(logged.warnings).toHaveLength(1);
    });
});
