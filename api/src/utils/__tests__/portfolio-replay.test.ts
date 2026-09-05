import { describe, expect, it } from 'vitest';
import { replayTrades, sortTrades, type ReplayTrade } from '@/utils/portfolio-replay.js';

/** Build a trade with sensible defaults so each test states only what it is about. */
function trade(overrides: Partial<ReplayTrade> & Pick<ReplayTrade, 'action'>): ReplayTrade {
    const tradeDate = overrides.tradeDate ?? new Date('2026-01-05T00:00:00Z');
    return {
        symbol: 'AAPL',
        shares: 0,
        price: 0,
        total: 0,
        commission: 0,
        createdAt: tradeDate,
        ...overrides,
        tradeDate,
    };
}

const deposit = (total: number, date: string): ReplayTrade =>
    trade({ action: 'deposit', symbol: null, total, tradeDate: new Date(date) });

const buy = (shares: number, price: number, date: string, symbol = 'AAPL'): ReplayTrade =>
    trade({ action: 'buy', symbol, shares, price, total: shares * price, tradeDate: new Date(date) });

const sell = (shares: number, price: number, date: string, symbol = 'AAPL'): ReplayTrade =>
    trade({ action: 'sell', symbol, shares, price, total: shares * price, tradeDate: new Date(date) });

const short = (shares: number, price: number, date: string, symbol = 'AAPL'): ReplayTrade =>
    trade({ action: 'short', symbol, shares, price, total: shares * price, tradeDate: new Date(date) });

const cover = (shares: number, price: number, date: string, symbol = 'AAPL'): ReplayTrade =>
    trade({ action: 'cover', symbol, shares, price, total: shares * price, tradeDate: new Date(date) });

describe('sortTrades', () => {
    it('breaks a same-day tie on createdAt, so a same-day buy replays before its sell', () => {
        const laterEntry = { ...buy(10, 100, '2026-01-05'), createdAt: new Date('2026-03-01T10:00:00Z') };
        const earlierEntry = { ...deposit(5000, '2026-01-05'), createdAt: new Date('2026-03-01T09:00:00Z') };

        expect(sortTrades([laterEntry, earlierEntry]).map((t) => t.action)).toEqual(['deposit', 'buy']);
    });
});

describe('replayTrades', () => {
    it('derives cash and an averaged position from the log', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            buy(10, 100, '2026-01-05'),
            buy(10, 120, '2026-01-06'),
        ]);

        expect(result.cash).toBe(7800);
        expect(result.positions).toEqual([{ symbol: 'AAPL', side: 'long', shares: 20, avgPrice: 110 }]);
        expect(result.violation).toBeNull();
    });

    it('leaves the average cost alone on a sell — only realised P/L uses the exit price', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            buy(20, 100, '2026-01-05'),
            sell(5, 150, '2026-01-08'),
        ]);

        expect(result.positions).toEqual([{ symbol: 'AAPL', side: 'long', shares: 15, avgPrice: 100 }]);
        expect(result.cash).toBe(8750);
    });

    it('drops a position that is fully sold', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            buy(10, 100, '2026-01-05'),
            sell(10, 130, '2026-01-08'),
        ]);

        expect(result.positions).toEqual([]);
        expect(result.cash).toBe(10_300);
    });

    it('reports the first trade that spends cash the log never deposited', () => {
        const result = replayTrades([deposit(500, '2026-01-01'), buy(10, 100, '2026-01-05')]);

        expect(result.violation).toMatchObject({ kind: 'buyingPower', available: 500, required: 1000 });
    });

    it('reports a sell of shares the log never bought', () => {
        const result = replayTrades([deposit(10_000, '2026-01-01'), sell(5, 100, '2026-01-05')]);

        expect(result.violation).toMatchObject({ kind: 'shares', symbol: 'AAPL', available: 0, required: 5 });
    });

    it('accepts a sell of the exact position — a share count is not rejected by float residue', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            buy(0.1, 100, '2026-01-05'),
            buy(0.2, 100, '2026-01-06'),
            sell(0.30000000000000004, 100, '2026-01-08'),
        ]);

        expect(result.violation).toBeNull();
        expect(result.positions).toEqual([]);
    });

    it('applies a back-dated trade in date order, not insertion order', () => {
        // The sell is entered second but dated first: replaying by date makes it
        // a sell against nothing, which is exactly what the caller must catch.
        const result = replayTrades([buy(10, 100, '2026-01-10'), sell(10, 100, '2026-01-05')]);

        expect(result.violation).toMatchObject({ kind: 'shares' });
    });

    it('settles a dividend after the trades dated the same day', () => {
        const result = replayTrades([deposit(10_000, '2026-01-01'), buy(10, 100, '2026-02-01')], {
            cashFlows: [{ symbol: 'AAPL', date: new Date('2026-02-01'), amount: 25 }],
        });

        expect(result.cash).toBe(9025);
    });

    it('records one value point per day, the last event of the day winning', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            buy(10, 100, '2026-01-05'),
            buy(10, 100, '2026-01-05'),
        ]);

        expect(result.valueHistory).toEqual([
            { date: '2026-01-01', value: 10_000 },
            { date: '2026-01-05', value: 10_000 },
        ]);
    });

    it('marks open positions at the last price seen, so a gain shows in the history', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            buy(10, 100, '2026-01-05'),
            buy(1, 200, '2026-01-06'),
        ]);

        // 8800 cash + 11 shares marked at the 200 just paid.
        expect(result.valueHistory.at(-1)).toEqual({ date: '2026-01-06', value: 11_000 });
    });

    it('keeps positions in separate symbols independent', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            buy(10, 100, '2026-01-05', 'AAPL'),
            buy(10, 50, '2026-01-05', 'MSFT'),
            sell(10, 110, '2026-01-08', 'AAPL'),
        ]);

        expect(result.positions).toEqual([{ symbol: 'MSFT', side: 'long', shares: 10, avgPrice: 50 }]);
    });
});

describe('replayTrades — short positions', () => {
    it('credits the proceeds of a short and opens the position on the short side', () => {
        const result = replayTrades([deposit(10_000, '2026-01-01'), short(10, 100, '2026-01-05')]);

        expect(result.cash).toBe(11_000);
        expect(result.positions).toEqual([{ symbol: 'AAPL', side: 'short', shares: 10, avgPrice: 100 }]);
        expect(result.violation).toBeNull();
    });

    it('books the fall in price as equity when the short is covered lower', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            short(10, 100, '2026-01-05'),
            cover(10, 60, '2026-01-20'),
        ]);

        expect(result.cash).toBe(10_400);
        expect(result.positions).toEqual([]);
    });

    it('values an open short as a liability, so the equity curve falls when it moves against you', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            short(10, 100, '2026-01-05'),
            short(10, 150, '2026-01-20'),
        ]);

        // Cash is 10,000 + 1,000 + 1,500; the 20 shares owed are marked at 150.
        expect(result.cash).toBe(12_500);
        expect(result.valueHistory.at(-1)?.value).toBe(9500);
    });

    it('refuses a cover larger than the position that is actually short', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            short(10, 100, '2026-01-05'),
            cover(15, 90, '2026-01-20'),
        ]);

        expect(result.violation).toMatchObject({ kind: 'shares', action: 'cover', available: 10, required: 15 });
    });

    it('refuses a short on a symbol already held long, rather than netting it away', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            buy(10, 100, '2026-01-05'),
            short(5, 120, '2026-01-20'),
        ]);

        expect(result.violation).toMatchObject({ kind: 'side', action: 'short', heldSide: 'long' });
    });

    it('refuses a sell against a short, which is a cover written the wrong way round', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            short(10, 100, '2026-01-05'),
            sell(5, 90, '2026-01-20'),
        ]);

        expect(result.violation).toMatchObject({ kind: 'side', action: 'sell', heldSide: 'short' });
    });

    it('lets each side of the book run independently on different symbols', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            buy(10, 100, '2026-01-05'),
            short(10, 50, '2026-01-06', 'MSFT'),
        ]);

        expect(result.positions).toEqual([
            { symbol: 'AAPL', side: 'long', shares: 10, avgPrice: 100 },
            { symbol: 'MSFT', side: 'short', shares: 10, avgPrice: 50 },
        ]);
    });
});

describe('replayTrades — leverage', () => {
    it('holds a cash account to its cash, shorts included', () => {
        const log = [deposit(1000, '2026-01-01'), short(20, 100, '2026-01-05')];

        expect(replayTrades(log).violation).toMatchObject({ kind: 'buyingPower' });
    });

    it('lets gross exposure reach equity times leverage', () => {
        const log = [deposit(1000, '2026-01-01'), buy(20, 100, '2026-01-05')];

        expect(replayTrades(log, { leverage: 2 }).violation).toBeNull();
        expect(replayTrades(log, { leverage: 1.5 }).violation).toMatchObject({ kind: 'buyingPower' });
    });

    it('counts a long and a short together as gross exposure, not against each other', () => {
        const log = [deposit(1000, '2026-01-01'), buy(10, 100, '2026-01-05'), short(10, 100, '2026-01-06', 'MSFT')];

        // Net exposure is zero, but 2,000 of gross needs 2x on 1,000 of equity.
        expect(replayTrades(log, { leverage: 2 }).violation).toBeNull();
        expect(replayTrades(log, { leverage: 1 }).violation).toMatchObject({ kind: 'buyingPower' });
    });

    it('lets cash go negative on margin, which is the loan', () => {
        const result = replayTrades([deposit(1000, '2026-01-01'), buy(20, 100, '2026-01-05')], { leverage: 2 });

        expect(result.cash).toBe(-1000);
        expect(result.valueHistory.at(-1)?.value).toBe(1000);
    });

    it('never blocks an exit, even from a book that has marked past its own limit', () => {
        const result = replayTrades(
            [
                deposit(1000, '2026-01-01'),
                buy(20, 100, '2026-01-05'),
                buy(1, 20, '2026-01-10'), // Re-marks the whole position down to 20
                sell(10, 20, '2026-01-11'),
            ],
            { leverage: 2 },
        );

        expect(result.violation).toMatchObject({ kind: 'buyingPower', action: 'buy' });
        expect(result.positions[0]).toMatchObject({ shares: 11 });
    });

    it('re-marks the shares already held at the price of the trade being checked', () => {
        // 10 shares bought at 100 are worth 2,000 once a second buy prints at 200,
        // so the limit binds on the re-marked book rather than on the old cost.
        const log = [deposit(1100, '2026-01-01'), buy(10, 100, '2026-01-05'), buy(1, 200, '2026-01-06')];

        expect(replayTrades(log).violation).toMatchObject({ kind: 'buyingPower' });
    });
});

describe('replayTrades — commission', () => {
    it('charges commission against cash on every action', () => {
        const result = replayTrades([
            { ...deposit(10_000, '2026-01-01') },
            { ...buy(10, 100, '2026-01-05'), commission: 5 },
            { ...sell(10, 110, '2026-01-20'), commission: 5 },
        ]);

        expect(result.cash).toBe(10_090);
    });

    it('counts commission against buying power, so a trade cannot be afforded by ignoring its cost', () => {
        const result = replayTrades([deposit(1000, '2026-01-01'), { ...buy(10, 100, '2026-01-05'), commission: 10 }]);

        expect(result.violation).toMatchObject({ kind: 'buyingPower' });
    });

    it('charges commission on a short’s proceeds rather than adding it', () => {
        const result = replayTrades([
            deposit(10_000, '2026-01-01'),
            { ...short(10, 100, '2026-01-05'), commission: 7 },
        ]);

        expect(result.cash).toBe(10_993);
    });
});
