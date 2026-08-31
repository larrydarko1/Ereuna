/**
 * The query builder is the highest-value thing to test here: it is a pure
 * function of the filter registry, so every filter kind can be checked without
 * a database, and a registry change that breaks a query shape fails here.
 */
import { describe, expect, it } from 'vitest';
import { buildQuery } from '@/services/screener/screener-query.js';

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

    it('maps AI recommendations to their nested query path, not the field name', () => {
        expect(buildQuery({ AIRecommendations: ['Buy'] })).toEqual({ 'AI.Recommendation': { $in: ['Buy'] } });
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
