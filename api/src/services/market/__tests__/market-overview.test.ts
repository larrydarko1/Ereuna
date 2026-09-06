import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const cache: { keys: string[]; options: unknown[] } = { keys: [], options: [] };
const state: { asset: Record<string, unknown> } = { asset: { Symbol: 'AAPL' } };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/cache.js', () => ({
    marketKey: (...parts: string[]) => `m:${parts.join(':')}`,
    withCache: (key: string, fetcher: () => Promise<unknown>, options: unknown) => {
        cache.keys.push(key);
        cache.options.push(options);
        return fetcher();
    },
}));
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
    it('passes the document through — one array of dates has nothing to model', async () => {
        const doc = { _id: 'Holidays', Holidays: [{ date: '2026-01-01', name: 'New Year' }] };
        db.current = fakeDb({ Stats: [doc] });
        await expect(holidays()).resolves.toBe(doc);
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
    it('returns both statement sets for a covered symbol', async () => {
        state.asset = {
            Symbol: 'AAPL',
            AnnualFinancials: [{ year: 2025 }],
            quarterlyFinancials: [{ quarter: 'Q2' }],
        };
        await expect(financials('AAPL')).resolves.toEqual({
            symbol: 'AAPL',
            annual: [{ year: 2025 }],
            quarterly: [{ quarter: 'Q2' }],
        });
    });

    it('answers empty lists for an uncovered symbol — that is not the same as the asset not existing', async () => {
        await expect(financials('AAPL')).resolves.toEqual({ symbol: 'AAPL', annual: [], quarterly: [] });
    });
});
