/**
 * The query builder is the highest-value thing to test here: it is a pure
 * function of the filter registry, so every filter kind can be checked without
 * a database, and a registry change that breaks a query shape fails here.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { ScreenerDoc } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/cache.js', () => ({
    userKey: (...parts: string[]) => parts.join(':'),
    withCache: <T>(_key: string, fetcher: () => Promise<T>) => fetcher(),
}));

const { buildQuery, runHiddenSymbols, runIncludedScreeners } = await import('@/services/screener/screener-query.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

const screener = (name: string, filters: ScreenerDoc['filters'] = {}): ScreenerDoc =>
    ({ userId: USER_ID, name, nameLower: name.toLowerCase(), include: true, filters }) as ScreenerDoc;

/** The pipeline the last aggregate was handed, as recorded by the stub. */
const pipeline = (): Record<string, unknown>[] =>
    db.current.of('AssetInfo').aggregate.mock.calls[0]?.[0] as Record<string, unknown>[];

const stage = <T>(name: string): T => (pipeline().find((entry) => name in entry) as Record<string, T>)[name] as T;

const matchStage = (): Record<string, unknown> => stage<Record<string, unknown>>('$match');
const projectStage = (): Record<string, unknown> => stage<Record<string, unknown>>('$project');

beforeEach(() => {
    db.current = fakeDb();
});

describe('buildQuery', () => {
    it('returns an empty query when no filters are set', () => {
        expect(buildQuery({})).toEqual({});
    });

    it('maps a range filter onto its AssetInfo path', () => {
        expect(buildQuery({ PE: [5, 15] })).toEqual({ PERatio: { $gt: 5, $lt: 15 } });
    });

    it('maps a quarterly-financials filter to its array-indexed path', () => {
        expect(buildQuery({ ROE: [0.1, 0.5] })).toEqual({
            'quarterlyFinancials.0.roe': { $gt: 0.1, $lt: 0.5 },
        });
    });

    it('maps a categorical filter with $in', () => {
        expect(buildQuery({ Sectors: ['Technology', 'Healthcare'] })).toEqual({
            Sector: { $in: ['Technology', 'Healthcare'] },
        });
    });

    it('maps a filter to its query path, not the field name it is stored under', () => {
        expect(buildQuery({ FundFamilies: ['Vanguard'] })).toEqual({ fundFamily: { $in: ['Vanguard'] } });
    });

    it('converts a stored date range into BSON dates', () => {
        const query = buildQuery({ IPO: ['2000-01-01', '2020-01-01'] }) as {
            IPO: { $gte: Date; $lte: Date };
        };
        expect(query.IPO.$gte).toBeInstanceOf(Date);
        expect(query.IPO.$gte.toISOString()).toBe('2000-01-01T00:00:00.000Z');
    });

    /**
     * The regression this file exists for. Price and every MA relation are all
     * $expr clauses; the previous implementation assigned each to `query.$expr`
     * in turn, so combining them silently kept only the last.
     */
    it('composes multiple $expr clauses into $and instead of overwriting', () => {
        const query = buildQuery({ Price: [10, 500], MA50: 'abv200', MA20: 'abv50' }) as { $and: unknown[] };
        expect(query.$and).toHaveLength(3);
    });

    it('compares a moving average against the close when the target is price', () => {
        const query = buildQuery({ MA200: 'blwprice' }) as { $and: { $expr: unknown }[] };
        expect(query.$and[0]?.$expr).toEqual({ $lt: ['$MA200', '$TimeSeries.close'] });
    });

    it('excludes hidden symbols', () => {
        expect(buildQuery({}, ['AAPL', 'MSFT'])).toEqual({ Symbol: { $nin: ['AAPL', 'MSFT'] } });
    });

    it('ignores malformed stored values rather than emitting a broken query', () => {
        expect(buildQuery({ PE: 'not-a-range', Sectors: [], MA50: 'nonsense' })).toEqual({});
    });
});

describe('runIncludedScreeners', () => {
    beforeEach(() => {
        db.current = fakeDb({
            Screeners: [screener('Growth', { PE: [5, 15] }), screener('Value', { PB: [0, 2] })],
            AssetInfo: [{ items: [], total: [] }],
        });
    });

    it('answers nothing at all when no screener is switched on', async () => {
        db.current = fakeDb({ Screeners: [] });

        await expect(runIncludedScreeners(USER_ID, { page: 1, limit: 10 })).resolves.toEqual({
            items: [],
            total: 0,
            page: 1,
            pages: 0,
        });
    });

    /**
     * The point of the combined list: a `$or` can only say that a symbol
     * matched, not which screens agreed on it, so each one runs as its own
     * tagged branch and the branches are grouped back together by symbol.
     */
    it('runs one tagged branch per screener and unions them', async () => {
        await runIncludedScreeners(USER_ID, { page: 1, limit: 10 });

        const stages = pipeline();
        const tags = JSON.stringify(stages);
        expect(tags).toContain('Growth');
        expect(tags).toContain('Value');
        expect(stages.filter((stage) => '$unionWith' in stage)).toHaveLength(1);
        expect(stages.some((stage) => '$group' in stage)).toBe(true);
    });

    it('leads with the symbols the most screeners agreed on', async () => {
        await runIncludedScreeners(USER_ID, { page: 1, limit: 10 });

        const sort = pipeline().find((stage) => '$sort' in stage) as { $sort: Record<string, number> };
        expect(sort.$sort).toEqual({ matches: -1, Symbol: 1 });
    });

    // Every branch carries the exclusion: a screener with no filters at all
    // matches the universe, and hiding a symbol has to survive that.
    it('excludes the hidden symbols from every branch', async () => {
        db.current = fakeDb({
            Screeners: [screener('Everything')],
            AssetInfo: [{ items: [], total: [] }],
        });

        await runIncludedScreeners(USER_ID, { page: 1, limit: 10, hiddenSymbols: ['AAPL'] });

        const match = pipeline().find((stage) => '$match' in stage) as { $match: Record<string, unknown> };
        expect(match.$match).toEqual({ Symbol: { $nin: ['AAPL'] } });
    });
});

describe('runHiddenSymbols', () => {
    it('reads nothing when nothing is hidden', async () => {
        await expect(runHiddenSymbols(USER_ID, { page: 1, limit: 10, hiddenSymbols: [] })).resolves.toEqual({
            items: [],
            total: 0,
            page: 1,
            pages: 0,
        });
    });

    it('queries the hidden symbols as full rows', async () => {
        await runHiddenSymbols(USER_ID, { page: 1, limit: 10, hiddenSymbols: ['AAPL', 'MSFT'] });

        expect(matchStage()).toEqual({ Symbol: { $in: ['AAPL', 'MSFT'] } });
    });

    it('projects the columns the account asked for, and refuses anything else', async () => {
        await runHiddenSymbols(USER_ID, {
            page: 1,
            limit: 10,
            hiddenSymbols: ['AAPL'],
            columns: ['PERatio', 'NotAColumn'],
        });

        expect(projectStage()).toHaveProperty('PERatio', 1);
        expect(projectStage()).not.toHaveProperty('NotAColumn');
    });

    // `quarterlyFinancials.0.assetsCurrent` as a projection path selects a field
    // literally named `0`. Nothing has one, so the column arrived empty and the
    // whole array rode along with it, one `{}` per quarter.
    it('rebuilds an array-indexed column instead of projecting its dotted path', async () => {
        await runHiddenSymbols(USER_ID, {
            page: 1,
            limit: 10,
            hiddenSymbols: ['AAPL'],
            columns: ['quarterlyFinancials.0.roe'],
        });

        const projection = projectStage();
        expect(projection).not.toHaveProperty(['quarterlyFinancials.0.roe']);
        expect(projection.quarterlyFinancials).toEqual([
            {
                $let: {
                    vars: { element: { $arrayElemAt: ['$quarterlyFinancials', 0] } },
                    in: { roe: '$$element.roe' },
                },
            },
        ]);
    });

    it('reads several fields of one quarter off a single element', async () => {
        await runHiddenSymbols(USER_ID, {
            page: 1,
            limit: 10,
            hiddenSymbols: ['AAPL'],
            columns: ['quarterlyFinancials.0.roe', 'quarterlyFinancials.0.assetsCurrent'],
        });

        const element = (projectStage().quarterlyFinancials as { $let: { in: Record<string, string> } }[])[0];
        expect(element?.$let.in).toEqual({ roe: '$$element.roe', assetsCurrent: '$$element.assetsCurrent' });
    });

    it('cuts the page before reshaping it, so only the returned rows are projected', async () => {
        await runHiddenSymbols(USER_ID, { page: 1, limit: 10, hiddenSymbols: ['AAPL'] });

        const stages = pipeline().map((stage) => Object.keys(stage)[0]);
        expect(stages.indexOf('$limit')).toBeLessThan(stages.indexOf('$project'));
    });
});
