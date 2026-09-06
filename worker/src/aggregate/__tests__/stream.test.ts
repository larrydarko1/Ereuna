import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TIINGO_GROUP, TIINGO_STREAM } from '@ereuna/shared';
import { fakeRedis, type RedisStub } from '@/__tests__/support/redis.js';

const redis: { current: RedisStub } = { current: fakeRedis() };
const applied: [string, number, number][] = [];
const logged: { errors: unknown[] } = { errors: [] };

vi.mock('@/lib/redis.js', () => ({ getConsumer: () => redis.current }));
vi.mock('@/aggregate/builder.js', () => ({
    applyTrade: (symbol: string, price: number, at: number): void => {
        applied.push([symbol, price, at]);
    },
}));
vi.mock('@/lib/logger.js', () => ({
    logger: {
        error: (payload: unknown): void => {
            logged.errors.push(payload);
        },
        info: (): void => {},
        warn: (): void => {},
        debug: (): void => {},
    },
}));

const { consumeTrades } = await import('@/aggregate/stream.js');
const { config } = await import('@/lib/config.js');

/** One stream read carrying `entries` under the vendor's `data` field. */
function read(...payloads: string[]): unknown {
    return [
        [TIINGO_STREAM, payloads.map((payload, index) => [`166-${index}`, ['data', payload]] as [string, string[]])],
    ];
}

const trade = (ticker: unknown, price: unknown, instant: unknown): string =>
    JSON.stringify({ service: 'iex', data: [instant, ticker, price] });

/** Run the loop for exactly `reads` iterations. */
async function consume(reads: number): Promise<void> {
    let iterations = 0;
    await consumeTrades(() => {
        const stop = iterations >= reads;
        iterations += 1;
        return stop;
    });
}

beforeEach(() => {
    redis.current = fakeRedis();
    applied.length = 0;
    logged.errors = [];
});

describe('joining the stream', () => {
    it('creates the consumer group with MKSTREAM, so it can start before the ingestor has written', async () => {
        await consume(0);
        expect(redis.current.xgroup).toHaveBeenCalledWith('CREATE', TIINGO_STREAM, TIINGO_GROUP, '0', 'MKSTREAM');
    });

    it('carries on when the group already exists', async () => {
        redis.current.xgroup.mockRejectedValueOnce(new Error('BUSYGROUP'));
        await expect(consume(0)).resolves.toBeUndefined();
        expect(logged.errors).toEqual([]);
    });

    it('names the consumer after the process, so two would not share an entry', async () => {
        redis.current.xreadgroup.mockResolvedValue(null);
        await consume(1);
        const [, group, name] = redis.current.xreadgroup.mock.calls[0] ?? [];
        expect(group).toBe(TIINGO_GROUP);
        expect(name).toBe(`${TIINGO_GROUP}-${process.pid}`);
    });

    it('reads a bounded batch with a blocking wait, taking only new entries', async () => {
        redis.current.xreadgroup.mockResolvedValue(null);
        await consume(1);
        expect(redis.current.xreadgroup).toHaveBeenCalledWith(
            'GROUP',
            TIINGO_GROUP,
            expect.any(String),
            'COUNT',
            config.stream.batchSize,
            'BLOCK',
            config.stream.blockMs,
            'STREAMS',
            TIINGO_STREAM,
            '>',
        );
    });

    it('stops without ever reading when told to stop first', async () => {
        await consume(0);
        expect(redis.current.xreadgroup).not.toHaveBeenCalled();
    });
});

describe('reading a batch', () => {
    it('applies each trade and acknowledges the whole batch in one round trip', async () => {
        redis.current.xreadgroup.mockResolvedValueOnce(
            read(trade('AAPL', 100, 1_700_000_000_000), trade('MSFT', 50, 1_700_000_000_001)),
        );
        await consume(1);

        expect(applied).toEqual([
            ['AAPL', 100, 1_700_000_000_000],
            ['MSFT', 50, 1_700_000_000_001],
        ]);
        expect(redis.current.xack).toHaveBeenCalledExactlyOnceWith(TIINGO_STREAM, TIINGO_GROUP, '166-0', '166-1');
    });

    it('acknowledges an entry it could not read, so a poison message is not replayed forever', async () => {
        redis.current.xreadgroup.mockResolvedValueOnce(read('not json'));
        await consume(1);
        expect(applied).toEqual([]);
        expect(redis.current.xack).toHaveBeenCalledWith(TIINGO_STREAM, TIINGO_GROUP, '166-0');
    });

    it('acknowledges nothing when the blocking read timed out', async () => {
        redis.current.xreadgroup.mockResolvedValueOnce(null);
        await consume(1);
        expect(redis.current.xack).not.toHaveBeenCalled();
    });

    it('acknowledges nothing for an empty read', async () => {
        redis.current.xreadgroup.mockResolvedValueOnce([[TIINGO_STREAM, []]]);
        await consume(1);
        expect(redis.current.xack).not.toHaveBeenCalled();
    });

    it('logs a failed read and keeps the loop alive — the stream is the only input', async () => {
        vi.useFakeTimers();
        redis.current.xreadgroup.mockRejectedValueOnce(new Error('connection lost'));
        redis.current.xreadgroup.mockResolvedValueOnce(read(trade('AAPL', 100, 1_700_000_000_000)));

        const done = consume(2);
        await vi.advanceTimersByTimeAsync(1_000);
        await done;

        expect(logged.errors).toHaveLength(1);
        expect(applied).toHaveLength(1);
        vi.useRealTimers();
    });

    it('ignores an entry with no `data` field', async () => {
        redis.current.xreadgroup.mockResolvedValueOnce([[TIINGO_STREAM, [['166-0', ['other', 'x']]]]]);
        await consume(1);
        expect(applied).toEqual([]);
    });
});

describe('decoding the vendor payload', () => {
    async function decode(payload: string): Promise<[string, number, number][]> {
        redis.current.xreadgroup.mockResolvedValueOnce(read(payload));
        await consume(1);
        return applied;
    }

    it('upper-cases the symbol', async () => {
        await expect(decode(trade('aapl', 100, 1_700_000_000_000))).resolves.toEqual([
            ['AAPL', 100, 1_700_000_000_000],
        ]);
    });

    it('coerces a price sent as a string', async () => {
        await expect(decode(trade('AAPL', '100.5', 1_700_000_000_000))).resolves.toEqual([
            ['AAPL', 100.5, 1_700_000_000_000],
        ]);
    });

    it('reads an ISO instant carrying a zone', async () => {
        await expect(decode(trade('AAPL', 100, '2026-09-04T15:30:00.000Z'))).resolves.toEqual([
            ['AAPL', 100, Date.parse('2026-09-04T15:30:00.000Z')],
        ]);
    });

    it("reads a zoneless instant as UTC, not as the server's own offset", async () => {
        await expect(decode(trade('AAPL', 100, '2026-09-04T15:30:00.000'))).resolves.toEqual([
            ['AAPL', 100, Date.parse('2026-09-04T15:30:00.000Z')],
        ]);
    });

    it('reads an instant with a numeric offset as sent', async () => {
        await expect(decode(trade('AAPL', 100, '2026-09-04T11:30:00.000-04:00'))).resolves.toEqual([
            ['AAPL', 100, Date.parse('2026-09-04T15:30:00.000Z')],
        ]);
    });

    it.each([
        ['malformed JSON', 'not json'],
        ['another service', JSON.stringify({ service: 'crypto', data: [1, 'BTC', 1] })],
        ['no data array', JSON.stringify({ service: 'iex' })],
        ['too short a data array', JSON.stringify({ service: 'iex', data: [1, 'AAPL'] })],
    ])('rejects %s', async (_label, payload) => {
        await expect(decode(payload)).resolves.toEqual([]);
    });

    it.each([
        ['no symbol', trade(undefined, 100, 1)],
        ['an empty symbol', trade('', 100, 1)],
        ['a numeric symbol', trade(42, 100, 1)],
    ])('rejects a trade with %s', async (_label, payload) => {
        await expect(decode(payload)).resolves.toEqual([]);
    });

    it.each([
        ['a non-numeric price', trade('AAPL', 'free', 1)],
        ['a zero price', trade('AAPL', 0, 1)],
        ['a negative price', trade('AAPL', -1, 1)],
        ['an infinite price', trade('AAPL', 'Infinity', 1)],
    ])("rejects a trade with %s — a NaN would poison the bucket's range", async (_label, payload) => {
        await expect(decode(payload)).resolves.toEqual([]);
    });

    it.each([
        ['an unparseable instant', trade('AAPL', 100, 'whenever')],
        ['an infinite instant', trade('AAPL', 100, Number.POSITIVE_INFINITY)],
        ['an object instant', trade('AAPL', 100, { at: 1 })],
    ])('rejects a trade with %s', async (_label, payload) => {
        await expect(decode(payload)).resolves.toEqual([]);
    });
});
