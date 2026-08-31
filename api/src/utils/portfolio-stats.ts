/**
 * Portfolio performance statistics, computed from the trade log.
 * The unit of analysis is the *closed lot*, not the trade: an exit is matched
 * FIFO against the open lots it closes, and each match produces one closed lot
 * with its own entry price, exit price, hold time and return. Every metric
 * below is an aggregate over those lots, which is why a position opened in
 * three tranches and closed once counts as three results rather than one.
 * Long and short lots queue separately and are settled by their own actions, so
 * a short's return is the entry falling to the exit rather than rising to it.
 * Commission is charged against the lots it opened and closed, pro-rated by
 * share count, so a strategy's returns here are net of its costs.
 * Pure: trades and a base value in, a snapshot out. Nothing is read or written.
 */
import type { PortfolioStatsSnapshot, PositionSide, TradeExtreme, TradeReturnsChart } from '@ereuna/shared';
import { sortTrades, type ReplayTrade } from '@/utils/portfolio-replay.js';

/** Annual risk-free rate used as the Sortino target return. */
const RISK_FREE_RATE = 0.02;

/** Width of one bucket in the return distribution, in percentage points. */
const RETURN_BIN_WIDTH = 2;

export type ClosedLot = {
    symbol: string;
    side: PositionSide;
    entryDate: Date;
    exitDate: Date;
    entryPrice: number;
    exitPrice: number;
    shares: number;
    commission: number; // Entry and exit commission, pro-rated onto this lot's shares
    returnPercent: number; // Net of commission, over the capital the entry committed
    profit: number;
    holdDays: number;
};

export function computeStats(trades: readonly ReplayTrade[], baseValue: number): PortfolioStatsSnapshot {
    const lots = closedLots(trades);
    const winners = lots.filter((lot) => lot.returnPercent > 0);
    const losers = lots.filter((lot) => lot.returnPercent < 0);
    const breakeven = lots.filter((lot) => lot.returnPercent === 0);

    const grossProfit = sum(winners.map((lot) => lot.profit));
    const grossLoss = Math.abs(sum(losers.map((lot) => lot.profit)));

    const avgGain = safeDiv(sum(winners.map((lot) => lot.returnPercent)), winners.length);
    const avgLoss = safeDiv(sum(losers.map((lot) => lot.returnPercent)), losers.length);

    const realizedPL = sum(lots.map((lot) => lot.profit));
    const { biggestWinner, biggestLoser } = extremes(lots);

    return {
        realizedPL: round(realizedPL),
        realizedPLPercent: round(safeDiv(realizedPL * 100, baseValue)),

        winnerCount: winners.length,
        loserCount: losers.length,
        breakevenCount: breakeven.length,
        winnerPercent: round(safeDiv(winners.length * 100, lots.length)),
        loserPercent: round(safeDiv(losers.length * 100, lots.length)),
        breakevenPercent: round(safeDiv(breakeven.length * 100, lots.length)),

        avgGain: round(avgGain),
        avgLoss: round(avgLoss),
        avgGainAbs: round(safeDiv(grossProfit, winners.length)),
        avgLossAbs: round(safeDiv(grossLoss, losers.length)),
        avgPositionSize: round(avgPositionSize(trades, baseValue)),
        avgHoldTimeWinners: round(safeDiv(sum(winners.map((lot) => lot.holdDays)), winners.length), 1),
        avgHoldTimeLosers: round(safeDiv(sum(losers.map((lot) => lot.holdDays)), losers.length), 1),

        gainLossRatio: ratio(Math.abs(avgGain), Math.abs(avgLoss)),
        profitFactor: ratio(grossProfit, grossLoss),
        riskRewardRatio: ratio(Math.abs(avgLoss), Math.abs(avgGain)),
        sortinoRatio: roundOrNull(sortino(lots)),

        totalCommission: round(sum(trades.map((trade) => trade.commission))),
        longCount: lots.filter((lot) => lot.side === 'long').length,
        shortCount: lots.filter((lot) => lot.side === 'short').length,

        biggestWinner,
        biggestLoser,
        tradeReturnsChart: returnDistribution(lots),
    };
}

/**
 * Match exits against open lots, FIFO, and return one record per match.
 * `buy` and `short` queue lots; `sell` and `cover` consume from the front of
 * their own side's queue until filled. Each side keys its own queue, so a
 * symbol traded both ways settles each book against itself.
 * An exit with no lot behind it is skipped rather than throwing — the service
 * rejects those on write, so reaching one here means a corrupt log, and a
 * corrupt row should cost one statistic rather than the whole summary.
 */
export function closedLots(trades: readonly ReplayTrade[]): ClosedLot[] {
    const open = new Map<string, OpenLot[]>();
    const lots: ClosedLot[] = [];

    for (const trade of sortTrades(trades)) {
        const side = sideOf(trade.action);
        if (trade.symbol === null || side === null) continue;

        const key = `${side}:${trade.symbol}`;
        const queue = open.get(key) ?? [];
        open.set(key, queue);

        // Commission is charged per share so a partial exit carries only its
        // share of the cost, and a lot filled by several exits is not billed
        // for each of them in full.
        const perShare = trade.shares === 0 ? 0 : trade.commission / trade.shares;

        if (trade.action === 'buy' || trade.action === 'short') {
            queue.push({ shares: trade.shares, price: trade.price, date: trade.tradeDate, commissionPerShare: perShare });
            continue;
        }

        let remaining = trade.shares;
        while (remaining > 0 && queue.length > 0) {
            const lot = queue[0];
            if (lot === undefined) break;

            const matched = Math.min(lot.shares, remaining);
            const commission = (lot.commissionPerShare + perShare) * matched;
            // A long earns the rise, a short earns the fall. Both risk the same
            // capital — entry price times shares — so both divide by it.
            const gross = (side === 'long' ? trade.price - lot.price : lot.price - trade.price) * matched;
            const committed = lot.price * matched;

            lots.push({
                symbol: trade.symbol,
                side,
                entryDate: lot.date,
                exitDate: trade.tradeDate,
                entryPrice: lot.price,
                exitPrice: trade.price,
                shares: matched,
                commission,
                returnPercent: committed === 0 ? 0 : ((gross - commission) / committed) * 100,
                profit: gross - commission,
                holdDays: daysBetween(lot.date, trade.tradeDate),
            });

            lot.shares -= matched;
            remaining -= matched;
            if (lot.shares <= 0) queue.shift();
        }
    }

    return lots;
}

type OpenLot = {
    shares: number;
    price: number;
    date: Date;
    commissionPerShare: number;
};

/** Which book an action belongs to, or null for a cash movement. */
function sideOf(action: ReplayTrade['action']): PositionSide | null {
    if (action === 'buy' || action === 'sell') return 'long';
    if (action === 'short' || action === 'cover') return 'short';
    return null;
}

/**
 * Sortino ratio over the closed-lot returns, with downside deviation measured
 * against the risk-free rate. Null when nothing closed below the target, since
 * a ratio with no downside in the denominator is not a meaningful number.
 */
function sortino(lots: readonly ClosedLot[]): number | null {
    if (lots.length === 0) return null;

    const returns = lots.map((lot) => lot.returnPercent / 100);
    const mean = sum(returns) / returns.length;
    const downside = returns.filter((value) => value < RISK_FREE_RATE);
    if (downside.length === 0) return null;

    const deviation = Math.sqrt(sum(downside.map((value) => (value - RISK_FREE_RATE) ** 2)) / downside.length);
    return deviation === 0 ? null : (mean - RISK_FREE_RATE) / deviation;
}

/** The best and worst symbols by total realised profit, with how many lots each closed. */
function extremes(lots: readonly ClosedLot[]): { biggestWinner: TradeExtreme | null; biggestLoser: TradeExtreme | null } {
    const totals = new Map<string, { amount: number; tradeCount: number }>();
    for (const lot of lots) {
        const entry = totals.get(lot.symbol) ?? { amount: 0, tradeCount: 0 };
        entry.amount += lot.profit;
        entry.tradeCount += 1;
        totals.set(lot.symbol, entry);
    }

    const ranked = [...totals.entries()].sort((a, b) => b[1].amount - a[1].amount);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    if (best === undefined || worst === undefined) return { biggestWinner: null, biggestLoser: null };

    return {
        biggestWinner: best[1].amount > 0 ? { ticker: best[0], amount: round(best[1].amount), tradeCount: best[1].tradeCount } : null,
        biggestLoser: worst[1].amount < 0 ? { ticker: worst[0], amount: round(Math.abs(worst[1].amount)), tradeCount: worst[1].tradeCount } : null,
    };
}

/**
 * Mean size of an opening trade as a percentage of the portfolio's base value.
 * Shorts count: the capital a short commits is exposure like any other, and a
 * book measured on its longs alone understates how much it puts at risk.
 */
function avgPositionSize(trades: readonly ReplayTrade[], baseValue: number): number {
    if (baseValue <= 0) return 0;
    const openings = trades.filter((trade) => trade.action === 'buy' || trade.action === 'short');
    return safeDiv(sum(openings.map((trade) => (trade.total / baseValue) * 100)), openings.length);
}

/** Bucket the closed-lot returns into fixed-width bins and locate the median. */
function returnDistribution(lots: readonly ClosedLot[]): TradeReturnsChart {
    if (lots.length === 0) return { bins: [], medianBinIndex: -1 };

    const returns = lots.map((lot) => lot.returnPercent);
    const floor = Math.floor(Math.min(...returns) / RETURN_BIN_WIDTH) * RETURN_BIN_WIDTH;
    const ceiling = Math.ceil(Math.max(...returns) / RETURN_BIN_WIDTH) * RETURN_BIN_WIDTH;

    const bins = [];
    for (let min = floor; min < Math.max(ceiling, floor + RETURN_BIN_WIDTH); min += RETURN_BIN_WIDTH) {
        const max = min + RETURN_BIN_WIDTH;
        bins.push({ min, max, range: `${min} to ${max}%`, count: 0, positive: max > 0 });
    }

    for (const value of returns) {
        const index = Math.min(bins.length - 1, Math.floor((value - floor) / RETURN_BIN_WIDTH));
        const bin = bins[index];
        if (bin !== undefined) bin.count += 1;
    }

    const median = percentile(returns, 0.5);
    return { bins, medianBinIndex: bins.findIndex((bin) => median >= bin.min && median < bin.max) };
}

function percentile(values: readonly number[], fraction: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length * fraction);
    if (sorted.length % 2 !== 0) return sorted[middle] ?? 0;
    return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function daysBetween(from: Date, to: Date): number {
    return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

function sum(values: readonly number[]): number {
    return values.reduce((total, value) => total + value, 0);
}

/** Division that yields 0 rather than NaN or Infinity on an empty denominator. */
function safeDiv(numerator: number, denominator: number): number {
    return denominator === 0 ? 0 : numerator / denominator;
}

function round(value: number, decimals = 2): number {
    if (!Number.isFinite(value)) return 0;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

/** A ratio with no denominator is undefined, not zero — the difference is reported, not flattened. */
function ratio(numerator: number, denominator: number): number | null {
    return denominator === 0 ? null : round(numerator / denominator);
}

function roundOrNull(value: number | null): number | null {
    return value === null ? null : round(value);
}
