import { describe, expect, it } from 'vitest';
import { closedLots, computeStats } from '@/utils/portfolio-stats.js';
import type { ReplayTrade } from '@/utils/portfolio-replay.js';

function trade(action: ReplayTrade['action'], shares: number, price: number, date: string, symbol = 'AAPL'): ReplayTrade {
    const tradeDate = new Date(date);
    return { symbol, action, shares, price, total: shares * price, commission: 0, tradeDate, createdAt: tradeDate };
}

describe('closedLots', () => {
    it('matches a sell against the oldest buy first', () => {
        const lots = closedLots([
            trade('buy', 10, 100, '2026-01-01'),
            trade('buy', 10, 200, '2026-01-02'),
            trade('sell', 10, 150, '2026-01-10'),
        ]);

        expect(lots).toHaveLength(1);
        expect(lots[0]).toMatchObject({ entryPrice: 100, exitPrice: 150, shares: 10, profit: 500 });
    });

    it('splits one sell across the several buys it closes', () => {
        const lots = closedLots([
            trade('buy', 5, 100, '2026-01-01'),
            trade('buy', 5, 200, '2026-01-02'),
            trade('sell', 10, 150, '2026-01-10'),
        ]);

        expect(lots.map((lot) => lot.profit)).toEqual([250, -250]);
    });

    it('counts hold time from each lot’s own entry date', () => {
        const lots = closedLots([trade('buy', 1, 100, '2026-01-01'), trade('sell', 1, 100, '2026-01-11')]);

        expect(lots[0]?.holdDays).toBe(10);
    });

    it('ignores cash movements, which close nothing', () => {
        const cash: ReplayTrade = {
            symbol: null,
            action: 'deposit',
            shares: 0,
            price: 0,
            total: 5000,
            commission: 0,
            tradeDate: new Date('2026-01-01'),
            createdAt: new Date('2026-01-01'),
        };

        expect(closedLots([cash, trade('buy', 1, 100, '2026-01-02')])).toEqual([]);
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

describe('closedLots — shorts', () => {
    it('books a short that is covered lower as a winner', () => {
        const lots = closedLots([trade('short', 10, 100, '2026-01-01'), trade('cover', 10, 80, '2026-01-11')]);

        expect(lots[0]).toMatchObject({ side: 'short', entryPrice: 100, exitPrice: 80, profit: 200 });
        expect(lots[0]?.returnPercent).toBe(20);
    });

    it('books a short that is covered higher as a loser', () => {
        const lots = closedLots([trade('short', 10, 100, '2026-01-01'), trade('cover', 10, 130, '2026-01-11')]);

        expect(lots[0]?.profit).toBe(-300);
    });

    it('settles each side of a symbol against its own queue', () => {
        const lots = closedLots([
            trade('buy', 10, 100, '2026-01-01'),
            trade('sell', 10, 120, '2026-01-05'),
            trade('short', 10, 120, '2026-01-06'),
            trade('cover', 10, 100, '2026-01-10'),
        ]);

        expect(lots.map((lot) => [lot.side, lot.profit])).toEqual([
            ['long', 200],
            ['short', 200],
        ]);
    });

    it('matches covers FIFO against the oldest short lot', () => {
        const lots = closedLots([
            trade('short', 5, 100, '2026-01-01'),
            trade('short', 5, 200, '2026-01-02'),
            trade('cover', 10, 150, '2026-01-10'),
        ]);

        expect(lots.map((lot) => lot.profit)).toEqual([-250, 250]);
    });

    it('counts each side in the snapshot', () => {
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

describe('closedLots — commission', () => {
    const withCommission = (base: ReplayTrade, commission: number): ReplayTrade => ({ ...base, commission });

    it('charges both legs against the lot they opened and closed', () => {
        const lots = closedLots([
            withCommission(trade('buy', 10, 100, '2026-01-01'), 5),
            withCommission(trade('sell', 10, 110, '2026-01-11'), 5),
        ]);

        expect(lots[0]).toMatchObject({ commission: 10, profit: 90 });
    });

    it('pro-rates an entry commission across the exits that consume the lot', () => {
        const lots = closedLots([
            withCommission(trade('buy', 10, 100, '2026-01-01'), 10),
            trade('sell', 5, 110, '2026-01-11'),
            trade('sell', 5, 110, '2026-01-12'),
        ]);

        // The 10 charged on entry is split 5/5, not billed twice in full.
        expect(lots.map((lot) => lot.commission)).toEqual([5, 5]);
    });

    it('reports the return net of cost, so a trade can gross a profit and still lose', () => {
        const lots = closedLots([
            withCommission(trade('buy', 1, 100, '2026-01-01'), 3),
            withCommission(trade('sell', 1, 102, '2026-01-11'), 3),
        ]);

        expect(lots[0]?.profit).toBe(-4);
        expect(lots[0]?.returnPercent).toBe(-4);
    });

    it('totals every trade’s commission, including one that closed nothing', () => {
        const stats = computeStats(
            [withCommission(trade('buy', 10, 100, '2026-01-01'), 5), withCommission(trade('buy', 10, 100, '2026-01-02'), 5)],
            10_000,
        );

        expect(stats.totalCommission).toBe(10);
    });
});
