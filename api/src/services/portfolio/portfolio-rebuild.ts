/**
 * portfolio-rebuild — replay a portfolio's trade log, and refuse it or persist it.
 * Positions, cash, value history and statistics are all projections of `Trades`.
 * Every mutation ends here: the log is read once, replayed in memory by the
 * pure helpers in `utils/`, and the result is written back. Nothing is
 * incremented in place, which is what makes editing and deleting a trade safe —
 * there is no running balance to get out of step with the log.
 * `validateLog` is the other half of the same replay: a candidate log is proved
 * before it is written, so a back-dated insert is checked against the state that
 * actually preceded it rather than against today's balance.
 */
import type { ObjectId, WithId } from 'mongodb';
import type { PortfolioDoc, PositionDoc, TradeDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { dividendSchedules } from '@/services/market/index.js';
import { dividendCashFlows } from '@/utils/dividends.js';
import { replayTrades, type LogViolation, type ReplayResult, type ReplayTrade } from '@/utils/portfolio-replay.js';
import { computeStats } from '@/utils/portfolio-stats.js';

export type PortfolioState = ReplayResult & {
    trades: WithId<TradeDoc>[];
};

/**
 * Read every trade in a portfolio, in replay order.
 * The documents are returned whole: `WithId<TradeDoc>` already satisfies
 * `ReplayTrade`, and keeping the `_id` lets the write paths identify a specific
 * trade inside a candidate log without a second read.
 */
export async function readTrades(userId: ObjectId, portfolioNumber: number): Promise<WithId<TradeDoc>[]> {
    return getDb()
        .collection<TradeDoc>('Trades')
        .find({ userId, portfolioNumber })
        .sort({ tradeDate: 1, createdAt: 1 })
        .toArray();
}

/**
 * Replay a candidate log at a given leverage and throw if it does not hold up.
 * Dividends are included, because they are cash the portfolio genuinely
 * received (or, on a short, genuinely owed) — leaving them out would reject a
 * buy the user could actually afford.
 */
export async function validateLog(trades: readonly ReplayTrade[], leverage: number): Promise<void> {
    const flows = dividendCashFlows(trades, await dividendSchedules(symbolsOf(trades)));
    const { violation, positions } = replayTrades(trades, flows, { leverage });

    if (violation !== null) throw toAppError(violation);

    if (positions.length > config.limits.positionsPerPortfolio) {
        throw new AppError(422, 'POSITION_LIMIT_REACHED', 'portfolio is at the open-position limit', {
            params: { max: config.limits.positionsPerPortfolio },
        });
    }
}

/**
 * Replay the stored log and persist what falls out of it.
 * Dividends are folded in as cash flows computed from the schedule and the
 * holdings on each payment date — they are derived on every rebuild and never
 * written to the trade log, so a corrected schedule takes effect immediately.
 */
export async function rebuild(userId: ObjectId, portfolioNumber: number): Promise<PortfolioState> {
    const db = getDb();
    const [trades, portfolio] = await Promise.all([
        readTrades(userId, portfolioNumber),
        db
            .collection<PortfolioDoc>('Portfolios')
            .findOne({ userId, number: portfolioNumber }, { projection: { baseValue: 1, leverage: 1 } }),
    ]);

    const flows = dividendCashFlows(trades, await dividendSchedules(symbolsOf(trades)));
    const state = replayTrades(trades, flows, { leverage: portfolio?.leverage });

    await persist(userId, portfolioNumber, trades, state, portfolio?.baseValue ?? 0);
    return { ...state, trades };
}

/** Map a replay violation onto the wire contract. */
export function toAppError(violation: LogViolation): AppError {
    const on = violation.tradeDate.toISOString().slice(0, 10);
    const params = {
        action: violation.action,
        symbol: violation.symbol ?? '',
        available: round2(violation.available),
        required: round2(violation.required),
        date: on,
    };

    if (violation.kind === 'buyingPower') {
        return new AppError(422, 'INSUFFICIENT_BUYING_POWER', `buying power short on ${on}`, { params });
    }

    if (violation.kind === 'side') {
        return new AppError(422, 'POSITION_SIDE_CONFLICT', `wrong side for ${violation.action} on ${on}`, {
            params: { ...params, heldSide: violation.heldSide ?? '' },
        });
    }

    return new AppError(422, 'INSUFFICIENT_SHARES', `share count short on ${on}`, { params });
}

function symbolsOf(trades: readonly ReplayTrade[]): string[] {
    return [...new Set(trades.flatMap((trade) => (trade.symbol === null ? [] : [trade.symbol])))];
}

async function persist(
    userId: ObjectId,
    portfolioNumber: number,
    trades: readonly ReplayTrade[],
    state: ReplayResult,
    baseValue: number,
): Promise<void> {
    const db = getDb();
    const now = new Date();

    await Promise.all([
        // Replace the whole position set rather than diffing it: the replay is
        // authoritative, so a delete-then-insert cannot leave a position the log
        // no longer supports, which a targeted update can.
        replacePositions(userId, portfolioNumber, state, now),
        db.collection<PortfolioDoc>('Portfolios').updateOne(
            { userId, number: portfolioNumber },
            {
                $set: {
                    cash: state.cash,
                    valueHistory: state.valueHistory,
                    stats: computeStats(trades, baseValue),
                    updatedAt: now,
                },
            },
        ),
    ]);
}

async function replacePositions(
    userId: ObjectId,
    portfolioNumber: number,
    state: ReplayResult,
    now: Date,
): Promise<void> {
    const positions = getDb().collection<PositionDoc>('Positions');
    await positions.deleteMany({ userId, portfolioNumber });

    if (state.positions.length === 0) return;

    await positions.insertMany(
        state.positions.map((position) => ({
            userId,
            portfolioNumber,
            symbol: position.symbol,
            side: position.side,
            shares: position.shares,
            avgPrice: position.avgPrice,
            updatedAt: now,
        })),
    );
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}
