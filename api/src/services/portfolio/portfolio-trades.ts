/**
 * portfolio-trades — the write path for the trade log.
 * Every mutation follows the same three steps: build the candidate log, replay
 * it to prove it still makes sense, then write and rebuild. Validating the
 * candidate rather than the current balance is what makes back-dating correct —
 * a trade inserted before existing ones is checked against the state that
 * actually preceded it, not against today's cash.
 */
import type { Collection, ObjectId, WithId } from 'mongodb';
import type { PortfolioDoc, TradeAction, TradeDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { requireAsset } from '@/services/market/index.js';
import {
    applyDeclaredState,
    ensurePortfolio,
    writeSettings,
    type DeclaredState,
    type PortfolioSettings,
} from '@/services/portfolio/portfolio-crud.js';
import { readTrades, rebuild, validateLog } from '@/services/portfolio/portfolio-rebuild.js';
import type { ReplayTrade } from '@/utils/portfolio-replay.js';

export type TradeInput = {
    symbol: string | null;
    action: TradeAction;
    shares: number;
    price: number;
    total: number;
    commission: number | null;
    tradeDate: Date;
};

export type TradeRow = Omit<TradeInput, 'commission'> & {
    id: string;
    commission: number;
    createdAt: Date;
};

export type TradePage = {
    items: TradeRow[];
    total: number;
    page: number;
    limit: number;
};

export function toTradeRow(doc: WithId<TradeDoc>): TradeRow {
    return {
        id: doc._id.toHexString(),
        symbol: doc.symbol,
        action: doc.action,
        shares: doc.shares,
        price: doc.price,
        total: doc.total,
        commission: doc.commission,
        tradeDate: doc.tradeDate,
        createdAt: doc.createdAt,
    };
}

/** The blotter: newest first, which is the order the index on (userId, portfolioNumber, tradeDate) serves. */
export async function listTrades(
    userId: ObjectId,
    portfolioNumber: number,
    options: { page: number; limit: number; symbol?: string },
): Promise<TradePage> {
    const { page, limit, symbol } = options;
    const filter = { userId, portfolioNumber, ...(symbol !== undefined ? { symbol } : {}) };

    const [items, total] = await Promise.all([
        collection().find(filter).sort({ tradeDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
        collection().countDocuments(filter),
    ]);

    return { items: items.map(toTradeRow), total, page, limit };
}

export async function addTrade(userId: ObjectId, portfolioNumber: number, input: TradeInput): Promise<TradeRow> {
    const portfolio = await ensurePortfolio(userId, portfolioNumber);
    assertNotFuture(input.tradeDate);
    if (input.symbol !== null) await requireAsset(input.symbol);

    const existing = await readTrades(userId, portfolioNumber);
    if (existing.length >= config.limits.tradesPerPortfolio) {
        throw new AppError(422, 'TRADE_LIMIT_REACHED', 'portfolio is at the trade limit', {
            params: { max: config.limits.tradesPerPortfolio },
        });
    }

    const candidate: ReplayTrade = { ...settle(input, portfolio), createdAt: new Date() };
    await validateLog([...existing, candidate], portfolio.leverage);

    const result = await collection().insertOne({ userId, portfolioNumber, ...candidate });
    await rebuild(userId, portfolioNumber);

    return toTradeRow({ _id: result.insertedId, userId, portfolioNumber, ...candidate });
}

export async function updateTrade(
    userId: ObjectId,
    portfolioNumber: number,
    tradeId: ObjectId,
    input: TradeInput,
): Promise<TradeRow> {
    const [portfolio, original] = await Promise.all([
        ensurePortfolio(userId, portfolioNumber),
        requireTrade(userId, portfolioNumber, tradeId),
    ]);
    assertNotFuture(input.tradeDate);
    if (input.symbol !== null) await requireAsset(input.symbol);

    const existing = await readTrades(userId, portfolioNumber);
    const fields = settle(input, portfolio);
    const edited: ReplayTrade = { ...fields, createdAt: original.createdAt };
    await validateLog([...withoutTrade(existing, tradeId), edited], portfolio.leverage);

    await collection().updateOne({ _id: tradeId, userId, portfolioNumber }, { $set: fields });
    await rebuild(userId, portfolioNumber);

    return toTradeRow({ ...original, ...fields });
}

export async function deleteTrade(userId: ObjectId, portfolioNumber: number, tradeId: ObjectId): Promise<void> {
    const [portfolio] = await Promise.all([
        ensurePortfolio(userId, portfolioNumber),
        requireTrade(userId, portfolioNumber, tradeId),
    ]);

    const existing = await readTrades(userId, portfolioNumber);
    await validateLog(withoutTrade(existing, tradeId), portfolio.leverage);

    await collection().deleteOne({ _id: tradeId, userId, portfolioNumber });
    await rebuild(userId, portfolioNumber);
}

/**
 * Replace the entire log — the import path.
 * All-or-nothing: the replacement is replayed before anything is written, so a
 * file with one bad row leaves the existing portfolio untouched.
 * Settings land first, because leverage and the default commission are what the
 * incoming trades are judged by: importing a 2:1 book into a slot that happens
 * to hold a cash account would otherwise reject a file consistent with itself.
 * A declared performance record travels with the file too, and is applied after
 * the rebuild, so a portfolio imported from elsewhere reads as its owner
 * recorded it rather than as this engine would recompute it.
 */
export async function replaceTrades(
    userId: ObjectId,
    portfolioNumber: number,
    inputs: readonly TradeInput[],
    settings: PortfolioSettings = {},
    declared: DeclaredState = {},
): Promise<number> {
    await writeSettings(userId, portfolioNumber, settings);
    const portfolio = await ensurePortfolio(userId, portfolioNumber);

    if (inputs.length > config.limits.tradesPerPortfolio) {
        throw new AppError(422, 'TRADE_LIMIT_REACHED', 'import exceeds the trade limit', {
            params: { max: config.limits.tradesPerPortfolio },
        });
    }

    for (const input of inputs) assertNotFuture(input.tradeDate);

    const symbols = [...new Set(inputs.flatMap((input) => (input.symbol === null ? [] : [input.symbol])))];
    await Promise.all(symbols.map((symbol) => requireAsset(symbol)));

    // `createdAt` follows the file's row order so that same-day rows replay in
    // the order they were exported, which is the order they originally settled.
    const base = Date.now();
    const candidates: ReplayTrade[] = inputs.map((input, index) => ({
        ...settle(input, portfolio),
        createdAt: new Date(base + index),
    }));
    await validateLog(candidates, portfolio.leverage);

    await collection().deleteMany({ userId, portfolioNumber });
    if (candidates.length > 0) {
        await collection().insertMany(candidates.map((trade) => ({ userId, portfolioNumber, ...trade })));
    }

    await rebuild(userId, portfolioNumber);
    await applyDeclaredState(userId, portfolioNumber, declared);

    return candidates.length;
}

/**
 * Fill in what the client left to the portfolio to decide.
 * The default commission is resolved here, once, and stored on the row: the log
 * keeps concrete numbers, so changing the default later cannot re-price a trade
 * that has already settled, and an export replays to the same result anywhere.
 */
function settle(input: TradeInput, portfolio: Pick<PortfolioDoc, 'defaultCommission'>): Omit<ReplayTrade, 'createdAt'> {
    return {
        symbol: input.symbol,
        action: input.action,
        shares: input.shares,
        price: input.price,
        total: input.total,
        commission: input.commission ?? portfolio.defaultCommission,
        tradeDate: input.tradeDate,
    };
}

/**
 * Reject future-dated trades.
 * A trade dated tomorrow prices a portfolio against bars that do not exist and
 * makes the value history run past today, so it is refused at the boundary.
 */
function assertNotFuture(tradeDate: Date): void {
    if (tradeDate.getTime() > Date.now()) {
        throw new AppError(422, 'INVALID_TRADE_DATE', 'trade date is in the future');
    }
}

/** Drop one trade from a candidate log, matched by id rather than by value. */
function withoutTrade(trades: readonly WithId<TradeDoc>[], tradeId: ObjectId): WithId<TradeDoc>[] {
    return trades.filter((trade) => !trade._id.equals(tradeId));
}

async function requireTrade(userId: ObjectId, portfolioNumber: number, tradeId: ObjectId): Promise<WithId<TradeDoc>> {
    const trade = await collection().findOne({ _id: tradeId, userId, portfolioNumber });
    if (trade === null) throw new AppError(404, 'TRADE_NOT_FOUND', `trade ${tradeId.toHexString()} not found`);
    return trade;
}

function collection(): Collection<TradeDoc> {
    return getDb().collection<TradeDoc>('Trades');
}
