import { describe, expect, it } from 'vitest';
import { dividendCashFlows, type DividendPayment } from '@/utils/dividends.js';
import type { ReplayTrade } from '@/utils/portfolio-replay.js';

function trade(action: ReplayTrade['action'], shares: number, date: string, symbol = 'AAPL'): ReplayTrade {
    const tradeDate = new Date(date);
    return { symbol, action, shares, price: 100, total: shares * 100, commission: 0, tradeDate, createdAt: tradeDate };
}

const schedule = (...dates: string[]): Map<string, DividendPayment[]> =>
    new Map([['AAPL', dates.map((date) => ({ paymentDate: new Date(date), amount: 0.5 }))]]);

describe('dividendCashFlows', () => {
    it('pays on the shares held when the payment lands', () => {
        const flows = dividendCashFlows([trade('buy', 100, '2026-01-01')], schedule('2026-03-01'));

        expect(flows).toEqual([{ symbol: 'AAPL', date: new Date('2026-03-01'), amount: 50 }]);
    });

    it('pays nothing for a payment before the position was opened', () => {
        expect(dividendCashFlows([trade('buy', 100, '2026-04-01')], schedule('2026-03-01'))).toEqual([]);
    });

    it('pays nothing once the position is closed', () => {
        const trades = [trade('buy', 100, '2026-01-01'), trade('sell', 100, '2026-02-01')];

        expect(dividendCashFlows(trades, schedule('2026-03-01'))).toEqual([]);
    });

    it('follows the holding as it changes across several payments', () => {
        const trades = [trade('buy', 100, '2026-01-01'), trade('sell', 50, '2026-02-15')];
        const flows = dividendCashFlows(trades, schedule('2026-02-01', '2026-03-01'));

        expect(flows.map((flow) => flow.amount)).toEqual([50, 25]);
    });

    it('pays on the post-trade holding when a payment shares a day with a trade', () => {
        const flows = dividendCashFlows([trade('buy', 100, '2026-03-01')], schedule('2026-03-01'));

        expect(flows[0]?.amount).toBe(50);
    });

    it('ignores a symbol the portfolio has never traded', () => {
        const trades = [trade('buy', 100, '2026-01-01', 'MSFT')];

        expect(dividendCashFlows(trades, schedule('2026-03-01'))).toEqual([]);
    });
});

describe('dividendCashFlows — shorts', () => {
    it('charges the dividend to a short seller instead of paying it', () => {
        const flows = dividendCashFlows([trade('short', 100, '2026-01-01')], schedule('2026-03-01'));

        expect(flows).toEqual([{ symbol: 'AAPL', date: new Date('2026-03-01'), amount: -50 }]);
    });

    it('stops charging once the short is covered', () => {
        const flows = dividendCashFlows(
            [trade('short', 100, '2026-01-01'), trade('cover', 100, '2026-02-01')],
            schedule('2026-03-01'),
        );

        expect(flows).toEqual([]);
    });
});
