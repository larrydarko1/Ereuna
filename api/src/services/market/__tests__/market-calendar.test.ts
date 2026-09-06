import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const cache: { keys: string[] } = { keys: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/cache.js', () => ({
    marketKey: (...parts: string[]) => `m:${parts.join(':')}`,
    withCache: (key: string, fetcher: () => Promise<unknown>) => {
        cache.keys.push(key);
        return fetcher();
    },
}));

const { dayCalendar } = await import('@/services/market/market-calendar.js');

const event = (type: string, symbol: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    _id: 'row',
    symbol,
    type,
    reportDate: new Date('2026-01-05T00:00:00.000Z'),
    ...extra,
});

beforeEach(() => {
    db.current = fakeDb({ Calendar: [] });
    cache.keys = [];
});

describe('dayCalendar', () => {
    it('splits one query into three lists by type', async () => {
        db.current = fakeDb({
            Calendar: [event('Earnings', 'AAPL'), event('Dividend', 'MSFT'), event('Split', 'TSLA')],
        });

        const day = await dayCalendar(new Date('2026-01-05T00:00:00.000Z'));
        expect(day.earnings.map((e) => e.symbol)).toEqual(['AAPL']);
        expect(day.dividends.map((e) => e.symbol)).toEqual(['MSFT']);
        expect(day.splits.map((e) => e.symbol)).toEqual(['TSLA']);
        expect(db.current.of('Calendar').find).toHaveBeenCalledOnce();
    });

    it('bounds the day in UTC, whatever time of day it was asked for', async () => {
        await dayCalendar(new Date('2026-01-05T18:45:00.000Z'));
        expect(db.current.of('Calendar').filters[0]).toEqual({
            reportDate: {
                $gte: new Date('2026-01-05T00:00:00.000Z'),
                $lt: new Date('2026-01-06T00:00:00.000Z'),
            },
        });
    });

    it('reports the date it actually served', async () => {
        await expect(dayCalendar(new Date('2026-01-05T18:45:00.000Z')).then((d) => d.date)).resolves.toBe('2026-01-05');
    });

    it('carries whatever the ingestor attached as the event details', async () => {
        db.current = fakeDb({ Calendar: [event('Dividend', 'MSFT', { amount: 0.75 })] });
        const day = await dayCalendar(new Date('2026-01-05T00:00:00.000Z'));
        expect(day.dividends[0]?.details).toEqual({ amount: 0.75 });
    });

    it('leaves the document id out of the details', async () => {
        db.current = fakeDb({ Calendar: [event('Split', 'TSLA', { ratio: 3 })] });
        const day = await dayCalendar(new Date('2026-01-05T00:00:00.000Z'));
        expect(day.splits[0]?.details).not.toHaveProperty('_id');
    });

    it('answers an empty day with three empty lists', async () => {
        await expect(dayCalendar(new Date('2026-01-05T00:00:00.000Z'))).resolves.toEqual({
            date: '2026-01-05',
            earnings: [],
            dividends: [],
            splits: [],
        });
    });

    it('caches by the day, not by the instant it was asked at', async () => {
        await dayCalendar(new Date('2026-01-05T01:00:00.000Z'));
        await dayCalendar(new Date('2026-01-05T23:00:00.000Z'));
        expect(cache.keys).toEqual(['m:calendar:2026-01-05', 'm:calendar:2026-01-05']);
    });
});
