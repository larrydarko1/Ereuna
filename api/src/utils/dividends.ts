/**
 * Dividend cash flows, derived from a payment schedule and a holdings history.
 * Dividends are NOT stored. They are recomputed from the trade log and the
 * ingestor's dividend schedule on every replay, so a corrected schedule or an
 * edited trade is reflected immediately.
 * A short position pays the dividend rather than receiving it: the holding is
 * tracked signed, so the flow it produces is signed too.
 */
import type { CashFlow, ReplayTrade } from '@/utils/portfolio-replay.js';
import { sortTrades } from '@/utils/portfolio-replay.js';

export type DividendPayment = {
    paymentDate: Date;
    amount: number;
};

/**
 * Walk the trade log once per symbol, tracking the signed holding, and emit a
 * cash flow for every scheduled payment that lands while it is non-zero.
 * A payment on the same day as a trade is settled on the post-trade holding,
 * matching how `replayTrades` orders same-day cash flows after trades.
 */
export function dividendCashFlows(
    trades: readonly ReplayTrade[],
    schedules: ReadonlyMap<string, readonly DividendPayment[]>,
): CashFlow[] {
    const flows: CashFlow[] = [];
    const ordered = sortTrades(trades);

    for (const [symbol, payments] of schedules) {
        const symbolTrades = ordered.filter((trade) => trade.symbol === symbol);
        if (symbolTrades.length === 0) continue;

        let shares = 0;
        let index = 0;

        for (const payment of [...payments].sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime())) {
            // Advance the holding to the payment date. The cursor only moves
            // forward because both lists are sorted, so this is one pass over
            // the trades per symbol rather than a rescan per payment.
            while (index < symbolTrades.length) {
                const trade = symbolTrades[index];
                if (trade === undefined || trade.tradeDate > payment.paymentDate) break;
                if (trade.action === 'buy' || trade.action === 'cover') shares += trade.shares;
                else if (trade.action === 'sell' || trade.action === 'short') shares -= trade.shares;
                index += 1;
            }

            if (shares !== 0 && payment.amount > 0) {
                flows.push({ symbol, date: payment.paymentDate, amount: shares * payment.amount });
            }
        }
    }

    return flows.sort((a, b) => a.date.getTime() - b.date.getTime());
}
