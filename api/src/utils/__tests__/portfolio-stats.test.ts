/**
 * Lot matching is exercised through `computeStats` rather than through the
 * matcher itself: the snapshot is what the module publishes, and every property
 * the matcher has — which lot an exit closes, how long it was held, what the
 * commission did to its return — is visible in the numbers the snapshot carries.
 * The cases below are built so FIFO and LIFO disagree, because a pair of lots
 * closed at the same size produces the same set of profits either way.
 */
import { describe, expect, it } from 'vitest';

import type { ReplayTrade } from '@/utils/portfolio-replay.js';
import { computeStats } from '@/utils/portfolio-stats.js';

function trade(
    action: ReplayTrade['action'],
    shares: number,
    price: number,
    date: string,
    symbol = 'AAPL',
): ReplayTrade {
    const tradeDate = new Date(date);
    return { symbol, action, shares, price, total: shares * price, commission: 0, tradeDate, createdAt: tradeDate };
}

const withCommission = (base: ReplayTrade, commission: number): ReplayTrade => ({ ...base, commission });

describe('lot matching', () => {
    it('matches a sell against the oldest buy first', () => {
        // Closing the 200 lot instead would book -500, not +500.
        const stats = computeStats(
            [
                trade('buy', 10, 100, '2026-01-01'),
                trade('buy', 10, 200, '2026-01-02'),
                trade('sell', 10, 150, '2026-01-10'),
            ],
            10_000,
        );

        expect(stats.realizedPL).toBe(500);
        expect(stats.winnerCount).toBe(1);
        expect(stats.loserCount).toBe(0);
    });

    it('splits one sell across the several buys it closes', () => {
        const stats = computeStats(
            [
                trade('buy', 5, 100, '2026-01-01'),
                trade('buy', 5, 200, '2026-01-02'),
                trade('sell', 10, 150, '2026-01-10'),
            ],
            10_000,
        );

        expect(stats).toMatchObject({ winnerCount: 1, loserCount: 1, realizedPL: 0 });
        expect(stats.avgGainAbs).toBe(250);
        expect(stats.avgLossAbs).toBe(250);
    });

    it('counts hold time from each lot’s own entry date, not from the first', () => {
        // Held ten days and five; measured from the earliest entry both would read ten.
        const stats = computeStats(
            [
                trade('buy', 1, 100, '2026-01-01'),
                trade('buy', 1, 100, '2026-01-06'),
                trade('sell', 2, 110, '2026-01-11'),
            ],
            10_000,
        );

        expect(stats.winnerCount).toBe(2);
        expect(stats.avgHoldTimeWinners).toBe(7.5);
    });

    it('ignores cash movements, which close nothing', () => {
        const deposit: ReplayTrade = {
            symbol: null,
            action: 'deposit',
            shares: 0,
            price: 0,
            total: 5000,
            commission: 0,
            tradeDate: new Date('2026-01-01'),
            createdAt: new Date('2026-01-01'),
        };
        const stats = computeStats([deposit, trade('buy', 1, 100, '2026-01-02')], 10_000);

        expect(stats).toMatchObject({ winnerCount: 0, loserCount: 0, breakevenCount: 0, realizedPL: 0 });
    });
});

describe('computeStats', () => {
    const trades = [
        trade('buy', 10, 100, '2026-01-01'),
        trade('sell', 10, 150, '2026-01-11'), // +500, +50%
        trade('buy', 10, 100, '2026-02-01', 'MSFT'),
        trade('sell', 10, 80, '2026-02-06', 'MSFT'), // -200, -20%
    ];

    it('splits closed lots into winners and losers', () => {
        const stats = computeStats(trades, 10_000);

        expect(stats.winnerCount).toBe(1);
        expect(stats.loserCount).toBe(1);
        expect(stats.winnerPercent).toBe(50);
    });

    it('reports realised P/L in currency and against the base value', () => {
        const stats = computeStats(trades, 10_000);

        expect(stats.realizedPL).toBe(300);
        expect(stats.realizedPLPercent).toBe(3);
    });

    it('computes the profit factor as gross profit over gross loss', () => {
        expect(computeStats(trades, 10_000).profitFactor).toBe(2.5);
    });

    it('names the best and worst symbol by realised profit', () => {
        const stats = computeStats(trades, 10_000);

        expect(stats.biggestWinner).toEqual({ ticker: 'AAPL', amount: 500, tradeCount: 1 });
        expect(stats.biggestLoser).toEqual({ ticker: 'MSFT', amount: 200, tradeCount: 1 });
    });

    it('reports a ratio with no denominator as null rather than zero', () => {
        const winnersOnly = [trade('buy', 10, 100, '2026-01-01'), trade('sell', 10, 150, '2026-01-11')];
        const stats = computeStats(winnersOnly, 10_000);

        expect(stats.profitFactor).toBeNull();
        expect(stats.gainLossRatio).toBeNull();
        expect(stats.loserCount).toBe(0);
    });

    it('returns an empty distribution and no extremes when nothing has closed', () => {
        const stats = computeStats([trade('buy', 10, 100, '2026-01-01')], 10_000);

        expect(stats.tradeReturnsChart).toEqual({ bins: [], medianBinIndex: -1 });
        expect(stats.biggestWinner).toBeNull();
        expect(stats.biggestLoser).toBeNull();
    });

    it('buckets every closed return, leaving no lot uncounted', () => {
        const stats = computeStats(trades, 10_000);
        const counted = stats.tradeReturnsChart.bins.reduce((total, bin) => total + bin.count, 0);

        expect(counted).toBe(2);
    });

    it('measures average position size against the base value, not the cash balance', () => {
        // Two buys of 1,000 against a 10,000 base — 10% each.
        expect(computeStats(trades, 10_000).avgPositionSize).toBe(10);
    });

    it('reports zero rather than dividing by a base value of zero', () => {
        const stats = computeStats(trades, 0);

        expect(stats.realizedPLPercent).toBe(0);
        expect(stats.avgPositionSize).toBe(0);
    });
});

describe('shorts', () => {
    it('books a short that is covered lower as a winner', () => {
        const stats = computeStats(
            [trade('short', 10, 100, '2026-01-01'), trade('cover', 10, 80, '2026-01-11')],
            10_000,
        );

        expect(stats).toMatchObject({ winnerCount: 1, shortCount: 1, longCount: 0, realizedPL: 200 });
        expect(stats.avgGain).toBe(20);
    });

    it('books a short that is covered higher as a loser', () => {
        const stats = computeStats(
            [trade('short', 10, 100, '2026-01-01'), trade('cover', 10, 130, '2026-01-11')],
            10_000,
        );

        expect(stats).toMatchObject({ loserCount: 1, realizedPL: -300 });
    });

    it('matches covers FIFO against the oldest short lot', () => {
        // Covering the 200 lot instead would book +250, not -250.
        const stats = computeStats(
            [
                trade('short', 5, 100, '2026-01-01'),
                trade('short', 5, 200, '2026-01-02'),
                trade('cover', 5, 150, '2026-01-10'),
            ],
            10_000,
        );

        expect(stats).toMatchObject({ loserCount: 1, winnerCount: 0, realizedPL: -250 });
    });

    it('settles each side of a symbol against its own queue', () => {
        const stats = computeStats(
            [
                trade('buy', 10, 100, '2026-01-01'),
                trade('sell', 10, 120, '2026-01-05'),
                trade('short', 10, 120, '2026-01-06'),
                trade('cover', 10, 100, '2026-01-10'),
            ],
            10_000,
        );

        expect(stats).toMatchObject({ longCount: 1, shortCount: 1, realizedPL: 400 });
    });
});

describe('commission', () => {
    it('charges both legs against the lot they opened and closed', () => {
        const stats = computeStats(
            [
                withCommission(trade('buy', 10, 100, '2026-01-01'), 5),
                withCommission(trade('sell', 10, 110, '2026-01-11'), 5),
            ],
            10_000,
        );

        expect(stats.realizedPL).toBe(90);
        expect(stats.totalCommission).toBe(10);
    });

    it('pro-rates an entry commission across the exits that consume the lot', () => {
        // The 10 charged on entry is split 5/5; billing it twice in full would
        // leave 80 rather than 90.
        const stats = computeStats(
            [
                withCommission(trade('buy', 10, 100, '2026-01-01'), 10),
                trade('sell', 5, 110, '2026-01-11'),
                trade('sell', 5, 110, '2026-01-12'),
            ],
            10_000,
        );

        expect(stats.winnerCount).toBe(2);
        expect(stats.realizedPL).toBe(90);
    });

    it('reports the return net of cost, so a trade can gross a profit and still lose', () => {
        const stats = computeStats(
            [
                withCommission(trade('buy', 1, 100, '2026-01-01'), 3),
                withCommission(trade('sell', 1, 102, '2026-01-11'), 3),
            ],
            10_000,
        );

        expect(stats).toMatchObject({ loserCount: 1, realizedPL: -4 });
        expect(stats.avgLoss).toBe(-4);
    });

    it('totals every trade’s commission, including one that closed nothing', () => {
        const stats = computeStats(
            [
                withCommission(trade('buy', 10, 100, '2026-01-01'), 5),
                withCommission(trade('buy', 10, 100, '2026-01-02'), 5),
            ],
            10_000,
        );

        expect(stats.totalCommission).toBe(10);
    });
});
