import { describe, expect, it } from 'vitest';
import type { StatsDoc } from '@ereuna/shared';
import { toMarketOverview } from '@/utils/market-overview.js';

/** A document shaped like the ingestor's, trimmed to what each case needs. */
function doc(fields: Record<string, unknown> = {}): StatsDoc {
    return { _id: 'marketStats', ...fields };
}

describe('toMarketOverview', () => {
    it('reads an index row under the period keys the ingestor uses', () => {
        const { indexes } = toMarketOverview(
            doc({
                indexPerformance: {
                    SPY: { 'lastPrice': 493.69, '1D': 0.0058, '1M': 0.026, '4M': 0.074, '1Y': 0.14, 'YTD': 0.02 },
                },
            }),
        );

        expect(indexes).toEqual([
            {
                symbol: 'SPY',
                lastPrice: 493.69,
                oneDay: 0.0058,
                oneMonth: 0.026,
                fourMonth: 0.074,
                oneYear: 0.14,
                yearToDate: 0.02,
            },
        ]);
    });

    it('nulls an index figure the ingestor left out rather than zeroing it', () => {
        const { indexes } = toMarketOverview(doc({ indexPerformance: { EFA: { lastPrice: 80 } } }));

        expect(indexes[0]).toMatchObject({ lastPrice: 80, oneDay: null, yearToDate: null });
    });

    it('parses the outlook periods out of the SMA names', () => {
        const { outlook } = toMarketOverview(
            doc({
                marketOutlook: {
                    shortTerm: { outlook: 'neutral', percentageUp: 56.83, smas: ['SMA5', 'SMA10', 'SMA20'] },
                },
            }),
        );

        expect(outlook).toEqual([{ term: 'short', verdict: 'neutral', percentUp: 56.83, periods: [5, 10, 20] }]);
    });

    it('drops an outlook verdict it does not recognise', () => {
        const { outlook } = toMarketOverview(
            doc({ marketOutlook: { midTerm: { outlook: 'euphoric', percentageUp: 90, smas: [] } } }),
        );

        expect(outlook).toEqual([]);
    });

    it('keys moving-average breadth by universe, skipping periods with no bucket', () => {
        const { movingAverages } = toMarketOverview(
            doc({
                SMA10: { ALL: { up: 0.53, down: 0.47 }, Crypto: { up: 0.17, down: 0.83 } },
                SMA200: { ALL: { up: 0.67, down: 0.33 } },
            }),
        );

        expect(movingAverages.all).toEqual([
            { period: 10, above: 0.53, below: 0.47 },
            { period: 200, above: 0.67, below: 0.33 },
        ]);
        expect(movingAverages.crypto).toEqual([{ period: 10, above: 0.17, below: 0.83 }]);
        expect(movingAverages.etf).toEqual([]);
    });

    it('drops a mover whose return arrived as a string rather than coercing it', () => {
        const { gainers } = toMarketOverview(
            doc({
                top10DailyGainers: [
                    { symbol: 'AAA', daily_return: '152' },
                    { symbol: 'BBB', daily_return: 12 },
                ],
            }),
        );

        expect(gainers).toEqual([{ symbol: 'BBB', dailyReturn: 12 }]);
    });

    it('answers with empty sections for a document that has none of them', () => {
        const overview = toMarketOverview(doc());

        expect(overview).toMatchObject({
            updatedAt: null,
            indexes: [],
            outlook: [],
            sectors: [],
            industries: [],
            gainers: [],
            losers: [],
            breadth: { advancing: 0, declining: 0, unchanged: 0, newHighs: 0, newLows: 0, neutral: 0 },
        });
    });

    it('accepts the ingest timestamp as a Date or as its ISO string', () => {
        expect(toMarketOverview(doc({ updatedAt: new Date('2026-01-22T00:00:00Z') })).updatedAt).toBe(
            '2026-01-22T00:00:00.000Z',
        );
        expect(toMarketOverview(doc({ updatedAt: '2026-01-22T00:00:00.000Z' })).updatedAt).toBe(
            '2026-01-22T00:00:00.000Z',
        );
        expect(toMarketOverview(doc({ updatedAt: 'not a date' })).updatedAt).toBeNull();
    });
});
