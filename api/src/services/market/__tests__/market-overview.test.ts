import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ZodType } from 'zod';

import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
const cache: { keys: string[]; options: unknown[] } = { keys: [], options: [] };

vi.mock('@/lib/cache.js', () => ({
    marketKey: (...parts: string[]) => `m:${parts.join(':')}`,
    withCache: async (key: string, schema: ZodType, fetcher: () => Promise<unknown>, options: unknown) => {
        cache.keys.push(key);
        cache.options.push(options);
        // Answered the way a hit is: through JSON and the call site's schema
        return schema.parse(JSON.parse(JSON.stringify(await fetcher())));
    },
}));
const state: { asset: Record<string, unknown> } = { asset: { Symbol: 'AAPL' } };
vi.mock('@/services/market/market-assets.js', () => ({ getAsset: () => Promise.resolve(state.asset) }));

const { financials, holidays, marketStats } = await import('@/services/market/market-overview.js');

beforeEach(() => {
    db.current = fakeDb({ Stats: [] });
    cache.keys = [];
    cache.options = [];
    state.asset = { Symbol: 'AAPL' };
});

describe('marketStats', () => {
    it("reads the one summary document and translates it out of the ingestor's vocabulary", async () => {
        db.current = fakeDb({ Stats: [{ _id: 'marketStats', updatedAt: new Date('2026-01-05T00:00:00.000Z') }] });
        const overview = await marketStats();

        expect(db.current.of('Stats').filters[0]).toEqual({ _id: 'marketStats' });
        expect(overview).toHaveProperty('breadth');
        expect(overview).toHaveProperty('outlook');
        expect(overview).not.toHaveProperty('_id');
    });

    it('refuses when the ingestor has never written it', async () => {
        db.current.of('Stats').results.findOne = null;
        await expect(marketStats()).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('caches it as price data, which moves on the ingest cycle', async () => {
        db.current = fakeDb({ Stats: [{ _id: 'marketStats' }] });
        await marketStats();
        expect(cache.keys).toEqual(['m:stats:marketStats']);
        expect(cache.options[0]).toMatchObject({ dataType: 'price' });
    });
});

describe('holidays', () => {
    it('answers with the calendar the document holds, and nothing else of it', async () => {
        const doc = { _id: 'Holidays', updatedAt: new Date(0), Holidays: [{ date: '2026-01-01', name: 'New Year' }] };
        db.current = fakeDb({ Stats: [doc] });
        await expect(holidays()).resolves.toEqual([{ date: '2026-01-01', name: 'New Year' }]);
    });

    it('fails as a server error when the document holds something other than a calendar', async () => {
        db.current = fakeDb({ Stats: [{ _id: 'Holidays', Holidays: [{ date: 20260101 }] }] });
        await expect(holidays()).rejects.toMatchObject({ status: 500, code: 'INTERNAL' });
    });

    it("holds it for a day, because it changes on the ingestor's schedule", async () => {
        db.current = fakeDb({ Stats: [{ _id: 'Holidays' }] });
        await holidays();
        expect(cache.options[0]).toEqual({ ttl: 86_400, dataType: 'static' });
    });

    it('refuses when it has never been ingested', async () => {
        db.current.of('Stats').results.findOne = null;
        await expect(holidays()).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
});

describe('financials', () => {
    it('returns both statement sets for a covered symbol, each figure a number or null', async () => {
        state.asset = {
            Symbol: 'AAPL',
            AnnualFinancials: [{ fiscalDateEnding: new Date('2025-09-27'), totalRevenue: 416e9, eps: 'NaN' }],
            quarterlyFinancials: [{ fiscalDateEnding: '2025-06-28T00:00:00.000Z', netIncome: '23.4e9' }],
        };
        await expect(financials('AAPL')).resolves.toEqual({
            symbol: 'AAPL',
            annual: [{ fiscalDateEnding: '2025-09-27T00:00:00.000Z', figures: { totalRevenue: 416e9, eps: null } }],
            quarterly: [{ fiscalDateEnding: '2025-06-28T00:00:00.000Z', figures: { netIncome: 23.4e9 } }],
        });
    });

    it('drops a line item no locale has a label for, and a period with no readable end date', async () => {
        state.asset = {
            Symbol: 'AAPL',
            quarterlyFinancials: [
                { fiscalDateEnding: new Date('2025-06-28'), totalRevenue: 1, vendorNewCode: 2 },
                { fiscalDateEnding: 'not a date', totalRevenue: 1 },
            ],
        };
        const { quarterly } = await financials('AAPL');
        expect(quarterly).toEqual([{ fiscalDateEnding: '2025-06-28T00:00:00.000Z', figures: { totalRevenue: 1 } }]);
    });

    it('answers empty lists for an uncovered symbol — that is not the same as the asset not existing', async () => {
        await expect(financials('AAPL')).resolves.toEqual({ symbol: 'AAPL', annual: [], quarterly: [] });
    });
});
