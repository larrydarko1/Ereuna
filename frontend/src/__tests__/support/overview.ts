/** The market overview fixture — one ingested document the dashboard reads. */
import type { BreadthUniverse, MarketOverview } from '@ereuna/shared';

export function overview(over: Partial<MarketOverview> = {}): MarketOverview {
    return {
        updatedAt: '2026-03-04T21:00:00.000Z',
        indexes: [
            {
                symbol: 'SPY',
                lastPrice: 500,
                oneDay: 0.01,
                oneMonth: 0.02,
                fourMonth: 0.03,
                oneYear: 0.04,
                yearToDate: 0.05,
            },
        ],
        outlook: [{ term: 'short', verdict: 'bullish', percentUp: 62.5, periods: [5, 10] }],
        breadth: {
            advancing: 0.6,
            declining: 0.3,
            unchanged: 0.1,
            newHighs: 0.2,
            newLows: 0.5,
            neutral: 0.3,
        },
        movingAverages: byUniverse(() => [{ period: 50, above: 0.6, below: 0.4 }]),
        sectors: [
            { name: 'Tech', averageReturn: 0.05, count: 40 },
            { name: 'Energy', averageReturn: -0.02, count: 20 },
        ],
        industries: [
            { name: 'Software', averageReturn: 0.06, count: 15 },
            { name: 'Drilling', averageReturn: -0.03, count: 8 },
        ],
        gainers: [{ symbol: 'AAPL', dailyReturn: 0.05 }],
        losers: [{ symbol: 'F', dailyReturn: -0.04 }],
        ...over,
    };
}

/**
 * One value per breadth universe. Spelled out rather than built from the shared list,
 * so a universe added there is a compile error here instead of a missing key.
 */
export function byUniverse<T>(make: (universe: BreadthUniverse) => T): Record<BreadthUniverse, T> {
    return {
        all: make('all'),
        stock: make('stock'),
        etf: make('etf'),
        fund: make('fund'),
        otc: make('otc'),
        pink: make('pink'),
        crypto: make('crypto'),
    };
}
