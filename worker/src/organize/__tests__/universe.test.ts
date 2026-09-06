import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const { PRIMARY_EXCHANGES, activeUniverse, chunk } = await import('@/organize/universe.js');

beforeEach(() => {
    db.current = fakeDb();
});

describe('PRIMARY_EXCHANGES', () => {
    it('is the two US primaries every statistic is measured over', () => {
        expect(PRIMARY_EXCHANGES).toEqual(['NYSE', 'NASDAQ']);
    });
});

describe('chunk', () => {
    it('splits into fixed-size pieces with a short remainder', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('divides evenly when it can', () => {
        expect(chunk([1, 2, 3, 4], 2)).toEqual([
            [1, 2],
            [3, 4],
        ]);
    });

    it('returns nothing for an empty list', () => {
        expect(chunk([], 10)).toEqual([]);
    });

    it('keeps a list shorter than one chunk in a single piece', () => {
        expect(chunk([1], 100)).toEqual([[1]]);
    });
});

describe('activeUniverse', () => {
    it('asks only for assets that are not delisted', async () => {
        db.current = fakeDb({ AssetInfo: [] });
        await activeUniverse();
        expect(db.current.of('AssetInfo').filters[0]).toEqual({ Delisted: { $ne: true } });
    });

    it('maps a complete document onto an asset', async () => {
        const ipo = new Date('2004-08-19T00:00:00.000Z');
        db.current = fakeDb({
            AssetInfo: [
                {
                    Symbol: 'GOOG',
                    AssetType: 'Stock',
                    Exchange: 'NASDAQ',
                    Sector: 'Technology',
                    Industry: 'Internet',
                    MarketCapitalization: 2_000_000_000,
                    SharesOutstanding: 12_000_000,
                    IPO: ipo,
                },
            ],
        });

        await expect(activeUniverse()).resolves.toEqual([
            {
                symbol: 'GOOG',
                assetType: 'Stock',
                exchange: 'NASDAQ',
                sector: 'Technology',
                industry: 'Internet',
                marketCap: 2_000_000_000,
                sharesOutstanding: 12_000_000,
                ipo,
            },
        ]);
    });

    it('empties out every reference field the vendor left off, rather than carrying undefined', async () => {
        db.current = fakeDb({ AssetInfo: [{ Symbol: 'AAPL' }] });
        const [asset] = await activeUniverse();
        expect(asset).toEqual({
            symbol: 'AAPL',
            assetType: '',
            exchange: '',
            sector: '',
            industry: '',
            marketCap: null,
            sharesOutstanding: null,
            ipo: null,
        });
    });

    it.each([
        ['a numeric string', '2000000000'],
        ['null', null],
        ['NaN is still a number and is kept — the caller decides', Number.NaN],
    ])('rejects a market cap that is %s', async (_label, value) => {
        db.current = fakeDb({ AssetInfo: [{ Symbol: 'AAPL', MarketCapitalization: value }] });
        const [asset] = await activeUniverse();
        expect(asset?.marketCap).toBe(typeof value === 'number' ? value : null);
    });

    it('drops an IPO date that is not a usable Date', async () => {
        db.current = fakeDb({
            AssetInfo: [
                { Symbol: 'A', IPO: new Date('not a date') },
                { Symbol: 'B', IPO: '2004-08-19' },
            ],
        });
        const assets = await activeUniverse();
        expect(assets.map((asset) => asset.ipo)).toEqual([null, null]);
    });
});
