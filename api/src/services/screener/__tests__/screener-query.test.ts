/**
 * The query builder is the highest-value thing to test here: it is a pure
 * function of the filter registry, so a registry change that breaks a query
 * shape fails here. It is reached the way the routes reach it — through
 * `runIncludedScreeners`, whose first `$match` stage is the query one screener's
 * filters built — rather than imported, because the module publishes the two
 * runners and nothing else.
 */
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ZodType } from 'zod';

import { isRecord } from '@ereuna/shared';

import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import { at, listAt, recordAt } from '@/__tests__/support/values.js';

vi.mock('@/lib/cache.js', () => ({
    userKey: (...parts: string[]) => parts.join(':'),
    // Answered the way a hit is: through JSON and the call site's schema
    withCache: async (_key: string, schema: ZodType, fetcher: () => Promise<unknown>) =>
        schema.parse(JSON.parse(JSON.stringify(await fetcher()))),
}));

const db: { current: DbStub } = { current: fakeDb() };
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const { runHiddenSymbols, runIncludedScreeners } = await import('@/services/screener/screener-query.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

/** A stored screener as the collection holds it; seeded raw, so a test can store what a typed one could not. */
const screener = (name: string, filters: Record<string, unknown> = {}): Record<string, unknown> => ({
    userId: USER_ID,
    name,
    nameLower: name.toLowerCase(),
    include: true,
    filters,
});

/** The pipeline the last aggregate was handed, as recorded by the stub. */
const pipeline = (): unknown[] => listAt(db.current.of('AssetInfo').aggregate.mock.calls, 0, 0);

/** The body of the first `name` stage in that pipeline — its `$match`, its `$project`. */
const stage = (name: string): Record<string, unknown> =>
    recordAt(
        pipeline().find((entry) => isRecord(entry) && name in entry),
        name,
    );

const matchStage = (): Record<string, unknown> => stage('$match');
const projectStage = (): Record<string, unknown> => stage('$project');

beforeEach(() => {
    db.current = fakeDb();
});

describe('the query one screener’s filters build', () => {
    /** Run one screener with `filters` and hand back the `$match` it produced. */
    const queryFor = async (
        filters: Record<string, unknown>,
        hiddenSymbols: string[] = [],
    ): Promise<Record<string, unknown>> => {
        db.current = fakeDb({ Screeners: [screener('One', filters)], AssetInfo: [{ items: [], total: [] }] });
        await runIncludedScreeners(USER_ID, { page: 1, limit: 10, hiddenSymbols });
        return matchStage();
    };

    it('returns an empty query when no filters are set', async () => {
        await expect(queryFor({})).resolves.toEqual({});
    });

    it('maps a range filter onto its AssetInfo path', async () => {
        await expect(queryFor({ PE: [5, 15] })).resolves.toEqual({ PERatio: { $gt: 5, $lt: 15 } });
    });

    it('maps a quarterly-financials filter to its array-indexed path', async () => {
        await expect(queryFor({ ROE: [0.1, 0.5] })).resolves.toEqual({
            'quarterlyFinancials.0.roe': { $gt: 0.1, $lt: 0.5 },
        });
    });

    it('maps a categorical filter with $in', async () => {
        await expect(queryFor({ Sectors: ['Technology', 'Healthcare'] })).resolves.toEqual({
            Sector: { $in: ['Technology', 'Healthcare'] },
        });
    });

    it('maps a filter to its query path, not the field name it is stored under', async () => {
        await expect(queryFor({ FundFamilies: ['Vanguard'] })).resolves.toEqual({
            fundFamily: { $in: ['Vanguard'] },
        });
    });

    it('converts a stored date range into BSON dates', async () => {
        const from = at(await queryFor({ IPO: ['2000-01-01', '2020-01-01'] }), 'IPO', '$gte');
        expect(from).toBeInstanceOf(Date);
        expect(from).toEqual(new Date('2000-01-01T00:00:00.000Z'));
    });

    /**
     * The regression this file exists for. Price and every MA relation are all
     * $expr clauses; the previous implementation assigned each to `query.$expr`
     * in turn, so combining them silently kept only the last.
     */
    it('composes multiple $expr clauses into $and instead of overwriting', async () => {
        const query = await queryFor({ Price: [10, 500], MA50: 'abv200', MA20: 'abv50' });
        expect(at(query, '$and')).toHaveLength(3);
    });

    it('compares a moving average against the close when the target is price', async () => {
        const query = await queryFor({ MA200: 'blwprice' });
        expect(at(query, '$and', 0, '$expr')).toEqual({ $lt: ['$MA200', '$TimeSeries.close'] });
    });

    it('excludes hidden symbols', async () => {
        await expect(queryFor({}, ['AAPL', 'MSFT'])).resolves.toEqual({ Symbol: { $nin: ['AAPL', 'MSFT'] } });
    });

    it('ignores malformed stored values rather than emitting a broken query', async () => {
        await expect(queryFor({ PE: 'not-a-range', Sectors: [], MA50: 'nonsense' })).resolves.toEqual({});
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
        expect(stages.filter((entry) => isRecord(entry) && '$unionWith' in entry)).toHaveLength(1);
        expect(stages.some((entry) => isRecord(entry) && '$group' in entry)).toBe(true);
    });

    it('leads with the symbols the most screeners agreed on', async () => {
        await runIncludedScreeners(USER_ID, { page: 1, limit: 10 });

        expect(stage('$sort')).toEqual({ matches: -1, Symbol: 1 });
    });

    // Every branch carries the exclusion: a screener with no filters at all
    // matches the universe, and hiding a symbol has to survive that.
    it('excludes the hidden symbols from every branch', async () => {
        db.current = fakeDb({
            Screeners: [screener('Everything')],
            AssetInfo: [{ items: [], total: [] }],
        });

        await runIncludedScreeners(USER_ID, { page: 1, limit: 10, hiddenSymbols: ['AAPL'] });

        expect(matchStage()).toEqual({ Symbol: { $nin: ['AAPL'] } });
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
        expect(projection['quarterlyFinancials']).toEqual([
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

        expect(at(projectStage(), 'quarterlyFinancials', 0, '$let', 'in')).toEqual({
            roe: '$$element.roe',
            assetsCurrent: '$$element.assetsCurrent',
        });
    });

    it('answers each chosen column flat under its path: a figure as a number, a category as text', async () => {
        db.current = fakeDb({
            AssetInfo: [
                {
                    Symbol: 'AAPL',
                    Name: 'Apple Inc',
                    AssetType: 'Stock',
                    Sector: 'Technology',
                    Exchange: 'NASDAQ',
                    PERatio: 'NaN',
                    Country: 'USA',
                    quarterlyFinancials: [{ roe: 0.42 }],
                    _internal: 'not a column',
                },
            ],
        });

        const page = await runHiddenSymbols(USER_ID, {
            page: 1,
            limit: 10,
            hiddenSymbols: ['AAPL'],
            columns: ['PERatio', 'Country', 'quarterlyFinancials.0.roe'],
        });

        expect(page.items).toEqual([
            {
                symbol: 'AAPL',
                name: 'Apple Inc',
                assetType: 'Stock',
                sector: 'Technology',
                exchange: 'NASDAQ',
                columns: { 'PERatio': null, 'Country': 'USA', 'quarterlyFinancials.0.roe': 0.42 },
            },
        ]);
    });

    it('cuts the page before reshaping it, so only the returned rows are projected', async () => {
        await runHiddenSymbols(USER_ID, { page: 1, limit: 10, hiddenSymbols: ['AAPL'] });

        const stages = pipeline().map((entry) => Object.keys(isRecord(entry) ? entry : {})[0]);
        expect(stages.indexOf('$limit')).toBeLessThan(stages.indexOf('$project'));
    });
});
