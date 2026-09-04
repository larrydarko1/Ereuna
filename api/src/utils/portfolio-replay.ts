/**
 * Portfolio replay — derive positions, cash and value history from the trade log.
 * `Trades` is the single source of truth. Positions and cash are projections of
 * it, rebuilt by this function after every mutation, which is why editing or
 * deleting a trade cannot leave a stale balance behind: nothing is incremented
 * in place, everything is recomputed from the log.
 * Pure: no database, no clock, no config. The caller supplies the trades, the
 * leverage to enforce and any derived cash flows (dividends), and persists
 * whatever comes back.
 */
import type { PortfolioValuePoint, PositionSide, TradeAction } from '@ereuna/shared';

export type ReplayTrade = {
    symbol: string | null;
    action: TradeAction;
    shares: number;
    price: number;
    total: number;
    commission: number;
    tradeDate: Date;
    createdAt: Date;
};

/** A cash movement that is not a trade — a dividend, computed from the holdings on its date. */
export type CashFlow = {
    symbol: string;
    date: Date;
    amount: number; // Negative when the holding is short: a short seller owes the dividend
};

/**
 * The first point at which the log stops making sense — exposure the equity
 * cannot carry, shares exited that were never opened, or a trade on the wrong
 * side of an open position. A stored log never has one, because every write is
 * validated by replaying the *candidate* log first; this is how back-dating an
 * insert is caught, which a check against the current balance cannot do.
 */
export type LogViolation = {
    kind: 'buyingPower' | 'shares' | 'side';
    action: TradeAction;
    symbol: string | null;
    tradeDate: Date;
    available: number;
    required: number;
    heldSide?: PositionSide; // For a `side` violation: the side the position is actually on
};

export type ReplayResult = {
    positions: ReplayPosition[];
    cash: number;
    valueHistory: PortfolioValuePoint[];
    violation: LogViolation | null;
};

export type ReplayOptions = {
    leverage?: number;
};

type ReplayPosition = {
    symbol: string;
    side: PositionSide;
    shares: number;
    avgPrice: number;
};

type ReplayEvent =
    | { kind: 'trade'; date: Date; order: number; trade: ReplayTrade }
    | { kind: 'cashFlow'; date: Date; order: number; amount: number };

/** Share counts below this are treated as zero — floating-point residue from partial exits. */
const SHARE_EPSILON = 1e-9;

/** Currency amounts within this of the limit are on the right side of it. */
const CASH_EPSILON = 0.005;

/** A cash account: gross exposure may not exceed equity. */
export const DEFAULT_LEVERAGE = 1;

/**
 * Chronological order, with `createdAt` breaking ties.
 * Two trades dated the same day must replay in the order they were entered, or
 * a same-day buy-then-sell can be replayed as a sell against nothing.
 */
export function sortTrades<T extends Pick<ReplayTrade, 'tradeDate' | 'createdAt'>>(trades: readonly T[]): T[] {
    return [...trades].sort((a, b) => {
        const byDate = a.tradeDate.getTime() - b.tradeDate.getTime();
        return byDate !== 0 ? byDate : a.createdAt.getTime() - b.createdAt.getTime();
    });
}

export function replayTrades(
    trades: readonly ReplayTrade[],
    cashFlows: readonly CashFlow[] = [],
    options: ReplayOptions = {},
): ReplayResult {
    const leverage = options.leverage ?? DEFAULT_LEVERAGE;
    const events = mergeEvents(trades, cashFlows);

    const book = new Map<string, ReplayPosition>();
    /** Last price seen per symbol — the mark used to value open positions at each point in the history. */
    const marks = new Map<string, number>();
    const valueHistory: PortfolioValuePoint[] = [];
    let cash = 0;
    let violation: LogViolation | null = null;

    for (const event of events) {
        if (event.kind === 'cashFlow') {
            cash += event.amount;
        } else {
            violation ??= checkTrade(book, marks, cash, leverage, event.trade);
            cash += applyTrade(book, marks, event.trade);
        }

        valueHistory.push({ date: dayOf(event.date), value: round2(cash + equityOfPositions(book, marks)) });
    }

    return {
        positions: [...book.values()].filter((position) => position.shares > SHARE_EPSILON),
        cash: round2(cash),
        valueHistory: onePointPerDay(valueHistory),
        violation,
    };
}

/** The signed effect of a trade on cash, commission included. */
function cashEffect(trade: ReplayTrade): number {
    const inflow = trade.action === 'sell' || trade.action === 'short' || trade.action === 'deposit';
    return (inflow ? trade.total : -trade.total) - trade.commission;
}

/** The side a position must already be on for this action to close it, or that it opens. */
function sideOf(action: TradeAction): PositionSide | null {
    if (action === 'buy' || action === 'sell') return 'long';
    if (action === 'short' || action === 'cover') return 'short';
    return null;
}

/**
 * Whether a trade can settle against the state in front of it.
 *
 * Opening trades and withdrawals are held to the buying-power constraint:
 * gross exposure after the trade may not exceed equity times leverage. At
 * leverage 1 that reduces exactly to "spend no more cash than you hold", so a
 * cash account behaves as it always did. Trades that *reduce* exposure —
 * sells, covers, deposits — are never blocked by it, because an account that
 * marks its way past its own limit must still be able to get out.
 *
 * Marks move only when a trade prices a symbol, so exposure is measured at the
 * last traded price. Between trades the ratio is unpoliced: simulating a margin
 * call would mean walking daily bars, which this function deliberately does not
 * read.
 */
function checkTrade(
    book: Map<string, ReplayPosition>,
    marks: Map<string, number>,
    cash: number,
    leverage: number,
    trade: ReplayTrade,
): LogViolation | null {
    const at = (kind: LogViolation['kind'], available: number, required: number): LogViolation => ({
        kind,
        action: trade.action,
        symbol: trade.symbol,
        tradeDate: trade.tradeDate,
        available,
        required,
    });

    const wanted = sideOf(trade.action);
    const existing = trade.symbol === null ? undefined : book.get(trade.symbol);

    if (wanted !== null && existing !== undefined && existing.side !== wanted) {
        return { ...at('side', existing.shares, trade.shares), heldSide: existing.side };
    }

    if (trade.action === 'sell' || trade.action === 'cover') {
        const held = existing?.shares ?? 0;
        return trade.shares - held > SHARE_EPSILON ? at('shares', held, trade.shares) : null;
    }

    if (trade.action === 'deposit') return null;

    const { equity, gross } = projected(book, marks, cash, trade);
    return gross - equity * leverage > CASH_EPSILON ? at('buyingPower', round2(equity * leverage), round2(gross)) : null;
}

/**
 * Equity and gross exposure as they would stand once `trade` has settled.
 * The traded symbol is valued at this trade's price throughout, including the
 * shares already held: a trade is a fresh print, so it re-marks the whole
 * position rather than leaving the old shares at a stale price.
 */
function projected(
    book: Map<string, ReplayPosition>,
    marks: Map<string, number>,
    cash: number,
    trade: ReplayTrade,
): { equity: number; gross: number } {
    let equity = cash + cashEffect(trade);
    let gross = 0;

    for (const position of book.values()) {
        const mark = position.symbol === trade.symbol ? trade.price : (marks.get(position.symbol) ?? position.avgPrice);
        const value = position.shares * mark;
        equity += position.side === 'long' ? value : -value;
        gross += value;
    }

    if (trade.symbol !== null) {
        equity += trade.action === 'short' ? -trade.total : trade.total;
        gross += trade.total;
    }

    return { equity, gross };
}

/** Apply one trade to the book and return its signed effect on cash. */
function applyTrade(book: Map<string, ReplayPosition>, marks: Map<string, number>, trade: ReplayTrade): number {
    const effect = cashEffect(trade);
    if (trade.symbol === null) return effect;

    marks.set(trade.symbol, trade.price);
    const side = sideOf(trade.action);
    if (side === null) return effect;

    const existing = book.get(trade.symbol);
    const opening = trade.action === 'buy' || trade.action === 'short';

    if (opening) {
        if (existing === undefined || existing.side !== side) {
            book.set(trade.symbol, { symbol: trade.symbol, side, shares: trade.shares, avgPrice: trade.price });
        } else {
            const shares = existing.shares + trade.shares;
            // Average cost, not FIFO: this is the book value of the open position.
            // Realised P/L is a separate FIFO walk in portfolio-stats.ts.
            existing.avgPrice = (existing.avgPrice * existing.shares + trade.price * trade.shares) / shares;
            existing.shares = shares;
        }
        return effect;
    }

    // An exit larger than the position can only mean a corrupt log — the service
    // rejects those before they are written. Clamp rather than throw, so one bad
    // row cannot make the whole portfolio unreadable.
    if (existing !== undefined && existing.side === side) {
        existing.shares = Math.max(0, existing.shares - trade.shares);
        if (existing.shares <= SHARE_EPSILON) book.delete(trade.symbol);
    }
    return effect;
}

/**
 * Net value of the open book: longs add, shorts subtract. Added to cash this is
 * the account's equity, which is what the value history plots — and it is
 * allowed to go negative, because a leveraged book that loses more than it holds
 * is a real outcome a simulator should show rather than clamp away.
 */
function equityOfPositions(book: Map<string, ReplayPosition>, marks: Map<string, number>): number {
    let total = 0;
    for (const position of book.values()) {
        const value = position.shares * (marks.get(position.symbol) ?? position.avgPrice);
        total += position.side === 'long' ? value : -value;
    }
    return total;
}

/**
 * One point per calendar day, the last event of that day winning. The history
 * is a daily series for charting, not a per-trade audit trail.
 */
function onePointPerDay(points: readonly PortfolioValuePoint[]): PortfolioValuePoint[] {
    const history: PortfolioValuePoint[] = [];
    for (const point of points) {
        const last = history[history.length - 1];
        if (last !== undefined && last.date === point.date) history[history.length - 1] = point;
        else history.push(point);
    }
    return history;
}

/**
 * Interleave trades and derived cash flows into one chronological stream.
 * A dividend paid on a day that also has trades settles after them, so the
 * holding it is paid on is the one the day's trades leave behind.
 */
function mergeEvents(trades: readonly ReplayTrade[], cashFlows: readonly CashFlow[]): ReplayEvent[] {
    const events: ReplayEvent[] = [
        ...sortTrades(trades).map((trade, index) => ({
            kind: 'trade' as const,
            date: trade.tradeDate,
            order: index,
            trade,
        })),
        ...cashFlows.map((flow) => ({
            kind: 'cashFlow' as const,
            date: flow.date,
            order: Number.MAX_SAFE_INTEGER,
            amount: flow.amount,
        })),
    ];

    return events.sort((a, b) => {
        const byDate = a.date.getTime() - b.date.getTime();
        return byDate !== 0 ? byDate : a.order - b.order;
    });
}

function dayOf(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}
