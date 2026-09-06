import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, setPayload, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));

const { updateMarketStats } = await import('@/organize/market-stats.js');

type Doc = Record<string, unknown>;

/** A priced NASDAQ common stock. Every field a statistic reads has a value. */
function asset(overrides: Doc = {}): Doc {
    return {
        'Symbol': 'AAPL',
        'AssetType': 'Stock',
        'Exchange': 'NASDAQ',
        'Sector': 'Technology',
        'Industry': 'Hardware',
        'MarketCapitalization': 1_000_000,
        'IntrinsicValue': 100,
        'TimeSeries': { close: 100 },
        'todaychange': 0.01,
        'quarterchange': 0.1,
        '1mchange': 0.02,
        '4mchange': 0.03,
        '1ychange': 0.04,
        'ytdchange': 0.05,
        'fiftytwoWeekHigh': 150,
        'fiftytwoWeekLow': 50,
        'MA5': 90,
        'MA10': 90,
        'MA20': 90,
        'MA50': 90,
        'MA100': 90,
        'MA150': 90,
        'MA200': 90,
        'metricsUpdatedAt': new Date('2026-09-04T20:00:00.000Z'),
        ...overrides,
    };
}

async function run(assets: Doc[]): Promise<Doc> {
    db.current = fakeDb({ AssetInfo: assets });
    await updateMarketStats();
    return setPayload<Doc>(db.current.of('Stats'));
}

beforeEach(() => {
    db.current = fakeDb();
});

describe('updateMarketStats', () => {
    it('reads only assets that are not delisted', async () => {
        await run([asset()]);
        expect(db.current.of('AssetInfo').filters[0]).toEqual({ Delisted: { $ne: true } });
    });

    it('upserts the one `marketStats` document', async () => {
        await run([asset()]);
        const [write] = db.current.of('Stats').writes;
        expect(write?.method).toBe('updateOne');
        expect(write?.args[0]).toEqual({ _id: 'marketStats' });
        expect(write?.args[2]).toEqual({ upsert: true });
    });

    it('writes nothing at all when no asset carries metrics yet', async () => {
        db.current = fakeDb({ AssetInfo: [] });
        await updateMarketStats();
        expect(db.current.of('Stats').writes).toEqual([]);
    });

    it('dates the document from the newest bar the run saw', async () => {
        const document = await run([
            asset({ Symbol: 'A', metricsUpdatedAt: new Date('2026-09-01T00:00:00.000Z') }),
            asset({ Symbol: 'B', metricsUpdatedAt: new Date('2026-09-04T00:00:00.000Z') }),
            asset({ Symbol: 'C', metricsUpdatedAt: 'not a date' }),
        ]);
        expect(document.updatedAt).toEqual(new Date('2026-09-04T00:00:00.000Z'));
    });

    it('leaves the date off when nothing carries one', async () => {
        const document = await run([asset({ metricsUpdatedAt: undefined })]);
        expect(document.updatedAt).toBeUndefined();
    });
});

describe('moving-average breadth', () => {
    it('reports one SMA field per period the panel renders', async () => {
        const document = await run([asset()]);
        for (const period of [5, 10, 20, 50, 100, 150, 200]) {
            expect(document).toHaveProperty(`SMA${period}`);
        }
    });

    it('splits a universe into fractions that add to one', async () => {
        const document = await run([
            asset({ Symbol: 'UP', TimeSeries: { close: 100 }, MA50: 90 }),
            asset({ Symbol: 'DOWN', TimeSeries: { close: 80 }, MA50: 90 }),
        ]);
        expect((document.SMA50 as Doc).ALL).toEqual({ up: 0.5, down: 0.5 });
    });

    it('reads a close exactly on the average as below it', async () => {
        const document = await run([asset({ TimeSeries: { close: 90 }, MA50: 90 })]);
        expect((document.SMA50 as Doc).ALL).toEqual({ up: 0, down: 1 });
    });

    it('reports zeroes rather than dividing by nothing when a period has no data', async () => {
        const document = await run([asset({ MA200: null })]);
        expect((document.SMA200 as Doc).ALL).toEqual({ up: 0, down: 0 });
    });

    it('sorts a NASDAQ common stock into Stock, not OTC or PINK', async () => {
        const document = await run([asset({ Exchange: 'NASDAQ' })]);
        const sma = document.SMA50 as Record<string, { up: number; down: number }>;
        expect(sma.Stock).toEqual({ up: 1, down: 0 });
        expect(sma.OTC).toEqual({ up: 0, down: 0 });
        expect(sma.PINK).toEqual({ up: 0, down: 0 });
    });

    it('sorts an off-exchange stock into OTC and one on PINK into PINK', async () => {
        const document = await run([
            asset({ Symbol: 'OTCCO', Exchange: 'OTCQB' }),
            asset({ Symbol: 'PINKCO', Exchange: 'PINK' }),
        ]);
        const sma = document.SMA50 as Record<string, { up: number; down: number }>;
        expect(sma.OTC).toEqual({ up: 1, down: 0 });
        expect(sma.PINK).toEqual({ up: 1, down: 0 });
        expect(sma.Stock).toEqual({ up: 0, down: 0 });
    });

    it('sorts a non-stock by its asset type', async () => {
        const document = await run([asset({ AssetType: 'ETF', Exchange: 'ARCA' })]);
        const sma = document.SMA50 as Record<string, { up: number; down: number }>;
        expect(sma.ETF).toEqual({ up: 1, down: 0 });
        expect(sma.Stock).toEqual({ up: 0, down: 0 });
    });
});

describe('the outlook', () => {
    const outlookOf = (document: Doc, term: string): { outlook: string; percentageUp: number; smas: string[] } =>
        (document.marketOutlook as Record<string, { outlook: string; percentageUp: number; smas: string[] }>)[term] as {
            outlook: string;
            percentageUp: number;
            smas: string[];
        };

    it('reads a market entirely above its averages as bullish', async () => {
        const document = await run([asset()]);
        expect(outlookOf(document, 'shortTerm').outlook).toBe('bullish');
        expect(outlookOf(document, 'shortTerm').percentageUp).toBe(100);
    });

    it('reads a market entirely below its averages as bearish', async () => {
        const document = await run([asset({ TimeSeries: { close: 10 } })]);
        expect(outlookOf(document, 'longTerm').outlook).toBe('bearish');
        expect(outlookOf(document, 'longTerm').percentageUp).toBe(0);
    });

    it('reads an evenly split market as neutral', async () => {
        const document = await run([
            asset({ Symbol: 'UP', TimeSeries: { close: 100 } }),
            asset({ Symbol: 'DOWN', TimeSeries: { close: 10 } }),
        ]);
        expect(outlookOf(document, 'midTerm').outlook).toBe('neutral');
        expect(outlookOf(document, 'midTerm').percentageUp).toBe(50);
    });

    it('names the averages each term was read from', async () => {
        const document = await run([asset()]);
        expect(outlookOf(document, 'shortTerm').smas).toEqual(['SMA5', 'SMA10', 'SMA20']);
        expect(outlookOf(document, 'midTerm').smas).toEqual(['SMA50', 'SMA100']);
        expect(outlookOf(document, 'longTerm').smas).toEqual(['SMA150', 'SMA200']);
    });

    it("uses the vocabulary the dashboard renders, not the Python's positive/negative", async () => {
        const document = await run([asset()]);
        for (const term of ['shortTerm', 'midTerm', 'longTerm']) {
            expect(['bullish', 'neutral', 'bearish']).toContain(outlookOf(document, term).outlook);
        }
    });
});

describe('advance/decline and new extremes', () => {
    it('splits stocks into advancing, declining and unchanged as fractions of one', async () => {
        const document = await run([
            asset({ Symbol: 'UP', todaychange: 0.01 }),
            asset({ Symbol: 'DOWN', todaychange: -0.01 }),
            asset({ Symbol: 'FLAT', todaychange: 0 }),
            asset({ Symbol: 'ETF', AssetType: 'ETF', todaychange: 0.5 }),
        ]);
        expect(document.advanceDecline).toEqual({
            advancing: 1 / 3,
            declining: 1 / 3,
            unchanged: 1 / 3,
        });
    });

    it('reports zeroes when no stock carries a change', async () => {
        const document = await run([asset({ todaychange: null })]);
        expect(document.advanceDecline).toEqual({ advancing: 0, declining: 0, unchanged: 0 });
    });

    it('counts a close at or above the 52-week high as a new high', async () => {
        const document = await run([
            asset({ Symbol: 'HIGH', TimeSeries: { close: 150 }, fiftytwoWeekHigh: 150 }),
            asset({ Symbol: 'LOW', TimeSeries: { close: 50 }, fiftytwoWeekLow: 50 }),
            asset({ Symbol: 'MID', TimeSeries: { close: 100 } }),
        ]);
        expect(document.newHighsLows).toEqual({ newHighs: 1 / 3, newLows: 1 / 3, neutral: 1 / 3 });
    });

    it('ignores a stock missing either extreme', async () => {
        const document = await run([asset({ fiftytwoWeekHigh: null })]);
        expect(document.newHighsLows).toEqual({ newHighs: 0, newLows: 0, neutral: 0 });
    });
});

describe('the tier lists', () => {
    it('weights a sector by market capitalisation, so the big name dominates', async () => {
        const document = await run([
            asset({ Symbol: 'BIG', MarketCapitalization: 900, quarterchange: 0.1 }),
            asset({ Symbol: 'SMALL', MarketCapitalization: 100, quarterchange: 0 }),
        ]);
        const [tier] = document.sectorTierList as { sector: string; average_return: number; count: number }[];
        expect(tier?.sector).toBe('Technology');
        expect(tier?.average_return).toBeCloseTo(0.09, 10);
        expect(tier?.count).toBe(2);
    });

    it('takes the median for an industry, so one outlier does not set the tier', async () => {
        const document = await run([
            asset({ Symbol: 'A', Industry: 'Hardware', quarterchange: 0.1 }),
            asset({ Symbol: 'B', Industry: 'Hardware', quarterchange: 0.2 }),
            asset({ Symbol: 'C', Industry: 'Hardware', quarterchange: 10 }),
        ]);
        const [tier] = document.industryTierList as { average_return: number }[];
        expect(tier?.average_return).toBe(0.2);
    });

    it('averages the middle two for an even-sized industry', async () => {
        const document = await run([
            asset({ Symbol: 'A', Industry: 'Hardware', quarterchange: 0.1 }),
            asset({ Symbol: 'B', Industry: 'Hardware', quarterchange: 0.3 }),
        ]);
        const [tier] = document.industryTierList as { average_return: number }[];
        expect(tier?.average_return).toBeCloseTo(0.2, 10);
    });

    it("drops a tier with only one member — that is one company's news, not a sector move", async () => {
        const document = await run([asset({ Sector: 'Solo' })]);
        expect(document.sectorTierList).toEqual([]);
    });

    it('sorts tiers best-performing first', async () => {
        const document = await run([
            asset({ Symbol: 'A', Sector: 'Weak', quarterchange: -0.1 }),
            asset({ Symbol: 'B', Sector: 'Weak', quarterchange: -0.1 }),
            asset({ Symbol: 'C', Sector: 'Strong', quarterchange: 0.5 }),
            asset({ Symbol: 'D', Sector: 'Strong', quarterchange: 0.5 }),
        ]);
        expect((document.sectorTierList as { sector: string }[]).map((tier) => tier.sector)).toEqual([
            'Strong',
            'Weak',
        ]);
    });

    it('ignores an unlabelled sector and anything off a primary exchange', async () => {
        const document = await run([
            asset({ Symbol: 'A', Sector: '' }),
            asset({ Symbol: 'B', Sector: '' }),
            asset({ Symbol: 'C', Exchange: 'PINK' }),
            asset({ Symbol: 'D', Exchange: 'PINK' }),
        ]);
        expect(document.sectorTierList).toEqual([]);
    });

    it('drops a sector whose members carry no capitalisation, rather than dividing by zero', async () => {
        const document = await run([
            asset({ Symbol: 'A', MarketCapitalization: 0 }),
            asset({ Symbol: 'B', MarketCapitalization: 0 }),
        ]);
        expect(document.sectorTierList).toEqual([]);
    });
});

describe('index performance', () => {
    it('reports the benchmarks and nothing else', async () => {
        const document = await run([asset({ Symbol: 'SPY' }), asset({ Symbol: 'AAPL' })]);
        expect(Object.keys(document.indexPerformance as Doc)).toEqual(['SPY']);
    });

    it('carries the last price and every horizon', async () => {
        const document = await run([asset({ Symbol: 'QQQ' })]);
        expect((document.indexPerformance as Doc).QQQ).toEqual({
            'lastPrice': 100,
            '1D': 0.01,
            '1M': 0.02,
            '4M': 0.03,
            '1Y': 0.04,
            'YTD': 0.05,
        });
    });
});

describe("the day's movers", () => {
    it('reports gainers descending and losers ascending, as percentages', async () => {
        const document = await run([
            asset({ Symbol: 'BEST', todaychange: 0.5 }),
            asset({ Symbol: 'MID', todaychange: 0.1 }),
            asset({ Symbol: 'WORST', todaychange: -0.4 }),
        ]);
        expect(document.top10DailyGainers).toEqual([
            { symbol: 'BEST', daily_return: 50 },
            { symbol: 'MID', daily_return: 10 },
            { symbol: 'WORST', daily_return: -40 },
        ]);
        expect((document.top10DailyLosers as { symbol: string }[])[0]?.symbol).toBe('WORST');
    });

    it('discards a move beyond 200%, which is a data error rather than a market event', async () => {
        const document = await run([
            asset({ Symbol: 'BROKEN', todaychange: 5 }),
            asset({ Symbol: 'REAL', todaychange: 0.1 }),
        ]);
        expect((document.top10DailyGainers as { symbol: string }[]).map((row) => row.symbol)).toEqual(['REAL']);
    });

    it('caps each list at ten', async () => {
        const many = Array.from({ length: 20 }, (_unused, index) =>
            asset({ Symbol: `S${index}`, todaychange: index / 100 }),
        );
        const document = await run(many);
        expect(document.top10DailyGainers).toHaveLength(10);
        expect(document.top10DailyLosers).toHaveLength(10);
    });

    it('ignores anything off a primary exchange', async () => {
        const document = await run([asset({ Symbol: 'PINKCO', Exchange: 'PINK', todaychange: 0.9 })]);
        expect(document.top10DailyGainers).toEqual([]);
    });
});

describe('the valuation extremes', () => {
    it('ranks the widest discount first for undervalued and the widest premium first for overvalued', async () => {
        const document = await run([
            asset({ Symbol: 'CHEAP', IntrinsicValue: 200, TimeSeries: { close: 100 } }),
            asset({ Symbol: 'RICH', IntrinsicValue: 50, TimeSeries: { close: 100 } }),
        ]);
        expect((document.top10Undervalued as { symbol: string }[])[0]?.symbol).toBe('CHEAP');
        expect((document.top10Overvalued as { symbol: string }[])[0]?.symbol).toBe('RICH');
    });

    it('rounds both prices to the cent', async () => {
        const document = await run([asset({ IntrinsicValue: 123.456, TimeSeries: { close: 99.994 } })]);
        expect((document.top10Undervalued as Doc[])[0]).toEqual({
            symbol: 'AAPL',
            current_price: 99.99,
            intrinsic_value: 123.46,
        });
    });

    it.each([
        ['no intrinsic value', { IntrinsicValue: null }],
        ['a non-positive intrinsic value', { IntrinsicValue: 0 }],
        ['no price', { TimeSeries: { close: 0 } }],
        ['a non-stock', { AssetType: 'ETF' }],
    ])('excludes an asset with %s', async (_label, overrides) => {
        const document = await run([asset(overrides)]);
        expect(document.top10Undervalued).toEqual([]);
    });
});
