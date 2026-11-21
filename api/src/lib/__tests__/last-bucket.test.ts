import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BUCKET_MS, lastCandleKey } from '@ereuna/shared';

import { fakeRedis, type RedisStub } from '@/__tests__/support/redis.js';

const redis: { current: RedisStub } = { current: fakeRedis() };
vi.mock('@/lib/redis.js', () => ({ getRedis: () => redis.current }));
const logs: { level: string; message: string }[] = [];
vi.mock('@/lib/logger.js', () => ({
    logger: {
        info: (_ctx: unknown, message: string) => logs.push({ level: 'info', message }),
        warn: (_ctx: unknown, message: string) => logs.push({ level: 'warn', message }),
        error: (_ctx: unknown, message: string) => logs.push({ level: 'error', message }),
        debug: () => {},
    },
}));

const { readLastCandle } = await import('@/lib/last-bucket.js');

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

beforeEach(() => {
    redis.current = fakeRedis();
    logs.length = 0;
    vi.useRealTimers();
});

describe('readLastCandle', () => {
    it("reads the aggregator's own key", async () => {
        await readLastCandle('AAPL', '1m');

        expect(redis.current.get).toHaveBeenCalledWith(lastCandleKey('AAPL', '1m'));
    });

    it('answers with the bucket while it is still the live one', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-02T14:30:30Z'));
        redis.current.store.set(lastCandleKey('AAPL', '1m'), JSON.stringify(bucket()));

        await expect(readLastCandle('AAPL', '1m')).resolves.toMatchObject({ tickerID: 'AAPL', close: 1.5 });
    });

    it('drops a bucket older than one bucket width — that is not the live bar', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(Date.parse('2026-03-02T14:30:00Z') + BUCKET_MS['1m']));
        redis.current.store.set(lastCandleKey('AAPL', '1m'), JSON.stringify(bucket()));

        await expect(readLastCandle('AAPL', '1m')).resolves.toBeNull();
    });

    it('drops a bucket stamped in the future', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-02T14:00:00Z'));
        redis.current.store.set(lastCandleKey('AAPL', '1m'), JSON.stringify(bucket()));

        await expect(readLastCandle('AAPL', '1m')).resolves.toBeNull();
    });

    it('answers null when nothing is stored', async () => {
        await expect(readLastCandle('AAPL', '1m')).resolves.toBeNull();
    });

    it('answers null when the stored payload is not a usable bucket', async () => {
        redis.current.store.set(lastCandleKey('AAPL', '1m'), 'nonsense');

        await expect(readLastCandle('AAPL', '1m')).resolves.toBeNull();
    });

    it('answers null and logs when Redis is unreachable', async () => {
        redis.current.breakAll();

        await expect(readLastCandle('AAPL', '1m')).resolves.toBeNull();
        expect(logs).toContainEqual({ level: 'warn', message: 'Last-candle read failed' });
    });
});
