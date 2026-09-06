import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const { assetExchange, assetProfile, corporateActions, dividendSchedules, earningsDates, getAsset, searchAssets } =
    await import('@/services/market/market-assets.js');

const asset = (over: Record<string, unknown> = {}): Record<string, unknown> => ({ Symbol: 'AAPL', ...over });

beforeEach(() => {
    db.current = fakeDb({ AssetInfo: [asset()] });
    cache.keys = [];
    cache.options = [];
});

describe('getAsset', () => {
    it('reads the reference row by symbol', async () => {
        const found = await getAsset('AAPL');

        expect(db.current.of('AssetInfo').filters[0]).toEqual({ Symbol: 'AAPL' });
        expect(found.Symbol).toBe('AAPL');
    });

    it('refuses a symbol the reference data has never heard of', async () => {
        db.current.of('AssetInfo').results.findOne = null;

        await expect(getAsset('NOPE')).rejects.toMatchObject({ status: 404, code: 'ASSET_NOT_FOUND' });
    });
});

describe('assetExchange', () => {
    it('answers with the listing venue', async () => {
        db.current = fakeDb({ AssetInfo: [asset({ Exchange: 'NASDAQ' })] });

        await expect(assetExchange('AAPL')).resolves.toBe('NASDAQ');
    });

    it('answers with an empty string when the reference data does not say', async () => {
        await expect(assetExchange('AAPL')).resolves.toBe('');
    });
});

describe('searchAssets', () => {
    const pipeline = (): Record<string, unknown>[] =>
        db.current.of('AssetInfo').filters[0] as Record<string, unknown>[];

    it('escapes the term before it reaches Mongo', async () => {
        await searchAssets('a.*a', 10);
        const match = pipeline()[0] as { $match: { $or: { Symbol?: { $regex: string } }[] } };

        expect(match.$match.$or[0]?.Symbol?.$regex).toBe('a\\.\\*a');
    });

    it('excludes delisted rows', async () => {
        await searchAssets('aa', 10);
        const match = pipeline()[0] as { $match: { Delisted: unknown } };

        expect(match.$match.Delisted).toEqual({ $ne: true });
    });

    it('caps the limit at fifty however many the caller asks for', async () => {
        await searchAssets('aa', 5000);

        expect(pipeline()[3]).toEqual({ $limit: 50 });
        expect(cache.keys[0]).toBe('m:search:aa:50');
    });

    it('keeps a smaller limit', async () => {
        await searchAssets('aa', 7);

        expect(pipeline()[3]).toEqual({ $limit: 7 });
    });

    it('sorts by score then by size, so the tie-break is not arbitrary', async () => {
        await searchAssets('aa', 10);

        expect(pipeline()[2]).toEqual({ $sort: { score: -1, MarketCapitalization: -1 } });
    });

    it('scores a prefix above a substring, and nudges common stocks on the major venues', async () => {
        await searchAssets('aa', 10);
        const terms = (pipeline()[1] as { $addFields: { score: { $sum: unknown[] } } }).$addFields.score.$sum;

        expect(terms).toHaveLength(9);
        expect(JSON.stringify(terms[0])).toContain('"^aa"');
        expect(terms[0]).toMatchObject({ $cond: [expect.anything(), 1000, 0] });
        expect(terms[3]).toMatchObject({ $cond: [expect.anything(), 500, 0] });
        expect(terms[6]).toEqual({ $cond: [{ $eq: ['$AssetType', 'Common Stock'] }, 50, 0] });
        expect(terms[7]).toEqual({ $cond: [{ $eq: ['$AssetType', 'ETF'] }, 30, 0] });
        expect(terms[8]).toEqual({ $cond: [{ $in: ['$Exchange', ['NASDAQ', 'NYSE', 'AMEX']] }, 20, 0] });
    });

    it('caches under a lowercased term as reference data', async () => {
        await searchAssets('AaPl', 10);

        expect(cache.keys).toEqual(['m:search:aapl:10']);
        expect(cache.options[0]).toEqual({ dataType: 'static' });
    });

    it('summarises each hit to the eight display fields', async () => {
        db.current = fakeDb({
            AssetInfo: [
                {
                    Symbol: 'AAPL',
                    Name: 'Apple Inc',
                    ISIN: 'US0378331005',
                    Exchange: 'NASDAQ',
                    AssetType: 'Common Stock',
                    Currency: 'USD',
                    Sector: 'Technology',
                    MarketCapitalization: 3e12,
                    Description: 'not a display field',
                },
            ],
        });

        await expect(searchAssets('aapl', 10)).resolves.toEqual([
            {
                symbol: 'AAPL',
                name: 'Apple Inc',
                isin: 'US0378331005',
                exchange: 'NASDAQ',
                assetType: 'Common Stock',
                currency: 'USD',
                sector: 'Technology',
                marketCap: 3e12,
            },
        ]);
    });

    it('nulls every summary field the row is missing', async () => {
        db.current = fakeDb({ AssetInfo: [{ Symbol: 'XYZ' }] });

        await expect(searchAssets('xyz', 10)).resolves.toEqual([
            {
                symbol: 'XYZ',
                name: null,
                isin: null,
                exchange: null,
                assetType: null,
                currency: null,
                sector: null,
                marketCap: null,
            },
        ]);
    });
});

describe('assetProfile', () => {
    it('maps the reference document onto the display shape', async () => {
        db.current = fakeDb({
            AssetInfo: [
                asset({
                    Name: 'Apple Inc',
                    AssetType: 'Common Stock',
                    Exchange: 'NASDAQ',
                    IPO: '1980-12-12',
                    Sector: 'Technology',
                    Country: 'USA',
                    companyWebsite: 'https://apple.com',
                    MarketCapitalization: 3e12,
                    PERatio: 31.4,
                    fundFamily: 'n/a',
                    netExpenseRatio: 0.03,
                }),
            ],
        });

        const profile = await assetProfile('AAPL');

        expect(profile).toMatchObject({
            symbol: 'AAPL',
            name: 'Apple Inc',
            assetType: 'Common Stock',
            exchange: 'NASDAQ',
            ipo: '1980-12-12',
            sector: 'Technology',
            location: 'USA',
            website: 'https://apple.com',
            delisted: false,
            marketCap: 3e12,
            pe: 31.4,
            fundFamily: 'n/a',
            netExpenseRatio: 0.03,
            signals: [],
        });
    });

    it('treats null, the empty string and the literal "NaN" as the same missing number', async () => {
        db.current = fakeDb({
            AssetInfo: [asset({ PERatio: null, PEGRatio: '', PriceToBookRatio: 'NaN', BookValue: '  ' })],
        });

        const profile = await assetProfile('AAPL');

        expect(profile.pe).toBeNull();
        expect(profile.peg).toBeNull();
        expect(profile.pb).toBeNull();
        expect(profile.bookValue).toBeNull();
    });

    it('parses a number written as a string, and rejects a non-finite one', async () => {
        db.current = fakeDb({ AssetInfo: [asset({ RSI: '61.5', Gap: Infinity, CAGR: 0 })] });

        const profile = await assetProfile('AAPL');

        expect(profile.rsi).toBe(61.5);
        expect(profile.gap).toBeNull();
        expect(profile.cagr).toBe(0);
    });

    it('treats "-" as the placeholder it is, and trims what it keeps', async () => {
        db.current = fakeDb({ AssetInfo: [asset({ Industry: '-', Sector: '  Technology  ', Currency: 42 })] });

        const profile = await assetProfile('AAPL');

        expect(profile.industry).toBeNull();
        expect(profile.sector).toBe('Technology');
        expect(profile.currency).toBeNull();
    });

    it('accepts a Date as well as a string for a date field, and drops an unparseable one', async () => {
        db.current = fakeDb({
            AssetInfo: [asset({ IPO: new Date('2004-08-19T00:00:00.000Z'), DividendDate: 'not a date' })],
        });

        const profile = await assetProfile('AAPL');

        expect(profile.ipo).toBe('2004-08-19');
        expect(profile.dividendDate).toBeNull();
    });

    it('drops an Invalid Date object', async () => {
        db.current = fakeDb({ AssetInfo: [asset({ IPO: new Date('nonsense') })] });

        await expect(assetProfile('AAPL')).resolves.toMatchObject({ ipo: null });
    });

    it('reports the delisted flag only when it is exactly true', async () => {
        db.current = fakeDb({ AssetInfo: [asset({ Delisted: 'yes' })] });

        await expect(assetProfile('AAPL')).resolves.toMatchObject({ delisted: false });
    });

    it('keeps only signals that have a direction, a date and a strategy', async () => {
        db.current = fakeDb({
            AssetInfo: [
                asset({
                    Signals: [
                        {
                            type: 'BUY',
                            date: '2026-03-02',
                            strategy: 'RSI_Oversold',
                            description: 'oversold',
                            price: '182.4',
                            indicator_value: 28,
                        },
                        { type: 'SELL', date: '2026-03-03', strategy: 'MACD_Bearish_Cross' },
                        { type: 'HOLD', date: '2026-03-04', strategy: 'Retired' },
                        { type: 'BUY', date: 'nonsense', strategy: 'RSI_Oversold' },
                        { type: 'BUY', date: '2026-03-05', strategy: '-' },
                        null,
                        'garbage',
                    ],
                }),
            ],
        });

        const profile = await assetProfile('AAPL');

        expect(profile.signals).toEqual([
            {
                date: '2026-03-02',
                direction: 'BUY',
                strategy: 'RSI_Oversold',
                description: 'oversold',
                price: 182.4,
                indicatorValue: 28,
            },
            {
                date: '2026-03-03',
                direction: 'SELL',
                strategy: 'MACD_Bearish_Cross',
                description: '',
                price: null,
                indicatorValue: null,
            },
        ]);
    });

    it('answers with no signals when the field is not an array', async () => {
        db.current = fakeDb({ AssetInfo: [asset({ Signals: 'none' })] });

        await expect(assetProfile('AAPL')).resolves.toMatchObject({ signals: [] });
    });

    it('refuses a symbol that is not in the reference data', async () => {
        db.current.of('AssetInfo').results.findOne = null;

        await expect(assetProfile('NOPE')).rejects.toMatchObject({ code: 'ASSET_NOT_FOUND' });
    });
});

describe('dividendSchedules', () => {
    it('does not touch the database for an empty request', async () => {
        await expect(dividendSchedules([])).resolves.toEqual(new Map());
        expect(db.current.collection).not.toHaveBeenCalled();
    });

    it('asks only for symbols that actually carry dividends', async () => {
        await dividendSchedules(['AAPL', 'MSFT']);

        expect(db.current.of('AssetInfo').filters[0]).toEqual({
            Symbol: { $in: ['AAPL', 'MSFT'] },
            dividends: { $exists: true, $ne: [] },
        });
    });

    it('keys the payments by symbol', async () => {
        db.current = fakeDb({
            AssetInfo: [
                { Symbol: 'AAPL', dividends: [{ date: '2026-02-13', amount: 0.24 }] },
                { Symbol: 'MSFT', dividends: [{ date: '2026-03-12', amount: 0.75 }] },
            ],
        });

        const schedules = await dividendSchedules(['AAPL', 'MSFT']);

        expect([...schedules.keys()]).toEqual(['AAPL', 'MSFT']);
        expect(schedules.get('AAPL')).toEqual([{ paymentDate: new Date('2026-02-13'), amount: 0.24 }]);
    });

    it('drops non-positive amounts and unparseable dates, and omits a symbol left with nothing', async () => {
        db.current = fakeDb({
            AssetInfo: [
                {
                    Symbol: 'AAPL',
                    dividends: [
                        { date: '2026-02-13', amount: 0 },
                        { date: '2026-05-13', amount: -1 },
                        { date: 'nonsense', amount: 0.24 },
                        { date: '2026-08-13', amount: '0.24' },
                    ],
                },
                { Symbol: 'MSFT' },
            ],
        });

        const schedules = await dividendSchedules(['AAPL', 'MSFT']);

        expect(schedules.size).toBe(0);
    });
});

describe('corporateActions', () => {
    const splits = [
        { date: '2014-06-09', ratio: 7 },
        { date: '2020-08-31', ratio: 4 },
        { date: '2024-01-02', ratio: 2 },
    ];

    it('answers newest first', async () => {
        db.current = fakeDb({ AssetInfo: [asset({ splits })] });

        const actions = await corporateActions('AAPL', 'splits', 10);

        expect(actions.map((action) => action.date)).toEqual(['2024-01-02', '2020-08-31', '2014-06-09']);
    });

    it('reverses before it slices, so the cap keeps the newest', async () => {
        db.current = fakeDb({ AssetInfo: [asset({ splits })] });

        const actions = await corporateActions('AAPL', 'splits', 2);

        expect(actions.map((action) => action.date)).toEqual(['2024-01-02', '2020-08-31']);
    });

    it('does not reverse the stored array in place', async () => {
        db.current = fakeDb({ AssetInfo: [asset({ splits: [...splits] })] });

        await corporateActions('AAPL', 'splits', 10);
        const stored = db.current.of('AssetInfo').seed[0] as { splits: { date: string }[] };

        expect(stored.splits[0]?.date).toBe('2014-06-09');
    });

    it('answers with nothing when the asset has no actions of that kind', async () => {
        await expect(corporateActions('AAPL', 'dividends', 10)).resolves.toEqual([]);
    });
});

describe('earningsDates', () => {
    it('answers with the fiscal quarter ends as plain dates', async () => {
        db.current = fakeDb({
            AssetInfo: [
                asset({
                    quarterlyIncome: [{ fiscalDateEnding: '2025-12-31' }, { fiscalDateEnding: '2026-03-31' }],
                }),
            ],
        });

        await expect(earningsDates('AAPL')).resolves.toEqual(['2025-12-31', '2026-03-31']);
    });

    it('drops rows the client would otherwise render as NaN', async () => {
        db.current = fakeDb({
            AssetInfo: [
                asset({
                    quarterlyIncome: [{ fiscalDateEnding: 'nonsense' }, {}, { fiscalDateEnding: '2026-03-31' }],
                }),
            ],
        });

        await expect(earningsDates('AAPL')).resolves.toEqual(['2026-03-31']);
    });

    it('answers with nothing when the ingestor has never written the statements', async () => {
        await expect(earningsDates('AAPL')).resolves.toEqual([]);
    });
});
