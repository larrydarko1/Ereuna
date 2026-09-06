import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const { loadUniverse } = await import('@/universe.js');

beforeEach(() => {
    db.current = fakeDb();
});

describe('loadUniverse', () => {
    it('asks for listed NASDAQ and NYSE assets only', async () => {
        db.current = fakeDb({ AssetInfo: [] });
        await loadUniverse();
        expect(db.current.of('AssetInfo').filters[0]).toEqual({
            Delisted: false,
            Exchange: { $in: ['NASDAQ', 'NYSE'] },
        });
    });

    it('upper-cases every symbol, because that is what the vendor subscribes by', async () => {
        db.current = fakeDb({ AssetInfo: [{ Symbol: 'aapl' }, { Symbol: 'MSFT' }] });
        await expect(loadUniverse()).resolves.toEqual(['AAPL', 'MSFT']);
    });

    it('de-duplicates, so one symbol is not subscribed to twice', async () => {
        db.current = fakeDb({ AssetInfo: [{ Symbol: 'AAPL' }, { Symbol: 'aapl' }] });
        await expect(loadUniverse()).resolves.toEqual(['AAPL']);
    });

    it.each([
        ['no symbol field', {}],
        ['an empty symbol', { Symbol: '' }],
    ])('drops a document with %s', async (_label, doc) => {
        db.current = fakeDb({ AssetInfo: [doc, { Symbol: 'AAPL' }] });
        await expect(loadUniverse()).resolves.toEqual(['AAPL']);
    });

    it('returns nothing for an empty collection rather than throwing', async () => {
        db.current = fakeDb({ AssetInfo: [] });
        await expect(loadUniverse()).resolves.toEqual([]);
    });
});
