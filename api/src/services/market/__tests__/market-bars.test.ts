import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OHLCV_COLLECTIONS, type ChartTimeframe } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const cache: { keys: string[]; options: unknown[] } = { keys: [], options: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/cache.js', () => ({
    marketKey: (...parts: string[]) => `m:${parts.join(':')}`,
    withCache: (key: string, fetcher: () => Promise<unknown>, options: unknown) => {
        cache.keys.push(key);
        cache.options.push(options);
        return fetcher();
    },
}));

const { barSeries } = await import('@/services/market/market-bars.js');

/** Bars as the query returns them — newest first, before the reversal. */
function newestFirst(count: number): Record<string, unknown>[] {
    return Array.from({ length: count }, (_unused, index) => ({
        tickerID: 'AAPL',
        timestamp: new Date(Date.UTC(2026, 0, count - index, 15, 30, 45, 123)),
        open: 100 + index,
        high: 110 + index,
        low: 90 + index,
        close: 105 + index,
        volume: 1_000 + index,
    }));
}

beforeEach(() => {
    db.current = fakeDb();
    cache.keys = [];
    cache.options = [];
});

describe('barSeries', () => {
    it('returns the page oldest first, which is what a chart draws', async () => {
        db.current = fakeDb({ [OHLCV_COLLECTIONS.daily]: newestFirst(3) });
        const series = await barSeries('AAPL', 'daily');
        expect(series.candles.map((c) => c.time)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    });

    it('splits each bar into a candle and a volume point on the same timestamps', async () => {
        db.current = fakeDb({ [OHLCV_COLLECTIONS.daily]: newestFirst(1) });
        const series = await barSeries('AAPL', 'daily');

        expect(series.candles[0]).toEqual({ time: '2026-01-01', open: 100, high: 110, low: 90, close: 105 });
        expect(series.volume[0]).toEqual({ time: '2026-01-01', value: 1_000 });
    });

    it('renders a daily bar as a calendar date and an intraday one to the second', async () => {
        db.current = fakeDb({ [OHLCV_COLLECTIONS.daily]: newestFirst(1) });
        await expect(barSeries('AAPL', 'daily').then((s) => s.candles[0]?.time)).resolves.toBe('2026-01-01');

        db.current = fakeDb({ [OHLCV_COLLECTIONS.intraday5m]: newestFirst(1) });
        await expect(barSeries('AAPL', 'intraday5m').then((s) => s.candles[0]?.time)).resolves.toBe(
            '2026-01-01T15:30:45',
        );
    });

    it.each(Object.entries(OHLCV_COLLECTIONS))('reads %s from %s', async (timeframe, collection) => {
        db.current = fakeDb({ [collection]: [] });
        await barSeries('AAPL', timeframe as ChartTimeframe);
        expect(db.current.collection).toHaveBeenCalledWith(collection);
    });

    it('takes the newest page when no cursor is given', async () => {
        db.current = fakeDb({ [OHLCV_COLLECTIONS.daily]: [] });
        await barSeries('AAPL', 'daily');
        expect(db.current.of(OHLCV_COLLECTIONS.daily).filters[0]).toEqual({ tickerID: 'AAPL' });
    });

    it('pages strictly older than the cursor, so a mid-scroll write cannot repeat or skip a bar', async () => {
        const before = new Date('2026-01-05T00:00:00.000Z');
        db.current = fakeDb({ [OHLCV_COLLECTIONS.daily]: [] });
        await barSeries('AAPL', 'daily', { before });

        expect(db.current.of(OHLCV_COLLECTIONS.daily).filters[0]).toEqual({
            tickerID: 'AAPL',
            timestamp: { $lt: before },
        });
    });

    it('caches each page under its own cursor, as price data', async () => {
        db.current = fakeDb({ [OHLCV_COLLECTIONS.daily]: [] });
        await barSeries('AAPL', 'daily');
        await barSeries('AAPL', 'daily', { before: new Date('2026-01-05T00:00:00.000Z') });

        expect(cache.keys).toEqual(['m:bars:AAPL:daily:latest', 'm:bars:AAPL:daily:2026-01-05T00:00:00.000Z']);
        expect(cache.options[0]).toEqual({ dataType: 'price' });
    });

    it('answers a symbol with no bars as an empty series', async () => {
        db.current = fakeDb({ [OHLCV_COLLECTIONS.daily]: [] });
        await expect(barSeries('NEWCO', 'daily')).resolves.toEqual({ candles: [], volume: [] });
    });
});
