/**
 * portfolio-crud — the portfolio slot itself: base value, leverage, commission,
 * benchmarks and deletion. Nothing here touches the trade log; everything that
 * changes what the log *means* ends in a rebuild, because a portfolio's stored
 * numbers are only ever a replay of its trades under the current settings.
 */
import type { Collection, ObjectId, WithId } from 'mongodb';
import type { PortfolioDoc, PortfolioStatsSnapshot, PortfolioValuePoint, PositionDoc, TradeDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { requireAsset } from '@/services/market/index.js';
import { readTrades, rebuild, validateLog } from '@/services/portfolio/portfolio-rebuild.js';
import { DEFAULT_LEVERAGE } from '@/utils/portfolio-replay.js';

export type PortfolioSummaryRow = {
    number: number;
    cash: number;
    baseValue: number;
    leverage: number;
    defaultCommission: number;
    benchmarks: string[];
    positionCount: number;
    updatedAt: Date;
};

export type PortfolioSettings = {
    baseValue?: number;
    leverage?: number;
    defaultCommission?: number;
    benchmarks?: readonly string[];
};

export type DeclaredState = {
    stats?: PortfolioStatsSnapshot;
    valueHistory?: PortfolioValuePoint[];
};

/**
 * Every slot the user has actually used.
 * Slots are created on first write, not up front: a user with one portfolio has
 * one document, and `GET /api/portfolios` returning one row is the truthful
 * answer rather than ten empty ones.
 */
export async function listPortfolios(userId: ObjectId): Promise<PortfolioSummaryRow[]> {
    const [portfolios, counts] = await Promise.all([
        collection().find({ userId }).sort({ number: 1 }).toArray(),
        getDb()
            .collection<PositionDoc>('Positions')
            .aggregate<{ _id: number; count: number }>([
                { $match: { userId } },
                { $group: { _id: '$portfolioNumber', count: { $sum: 1 } } },
            ])
            .toArray(),
    ]);

    const byNumber = new Map(counts.map((row) => [row._id, row.count]));
    return portfolios.map((doc) => ({
        number: doc.number,
        cash: doc.cash,
        baseValue: doc.baseValue,
        leverage: doc.leverage,
        defaultCommission: doc.defaultCommission,
        benchmarks: doc.benchmarks,
        positionCount: byNumber.get(doc.number) ?? 0,
        updatedAt: doc.updatedAt,
    }));
}

export async function getPortfolio(userId: ObjectId, number: number): Promise<WithId<PortfolioDoc>> {
    const doc = await collection().findOne({ userId, number });
    if (doc === null) throw new AppError(404, 'PORTFOLIO_NOT_FOUND', `portfolio ${number} not found`);
    return doc;
}

/**
 * Fetch the slot, creating it on first use.
 * Every write path calls this instead of erroring on a missing slot, so a user
 * makes their first deposit without a separate "create portfolio" step. The
 * upsert is atomic, so two concurrent first writes cannot both insert — the
 * unique index on (userId, number) is what guarantees it.
 */
export async function ensurePortfolio(userId: ObjectId, number: number): Promise<WithId<PortfolioDoc>> {
    const now = new Date();
    const doc = await collection().findOneAndUpdate(
        { userId, number },
        {
            $setOnInsert: {
                userId,
                number,
                cash: 0,
                baseValue: 0,
                leverage: DEFAULT_LEVERAGE,
                defaultCommission: 0,
                benchmarks: [],
                stats: null,
                valueHistory: [],
                createdAt: now,
                updatedAt: now,
            },
        },
        { upsert: true, returnDocument: 'after' },
    );

    if (doc === null) throw new AppError(404, 'PORTFOLIO_NOT_FOUND', `portfolio ${number} could not be opened`);
    return doc;
}

/**
 * The reference capital a portfolio's percentage returns are measured against.
 * Held separately from cash because it is a denominator, not a balance: it does
 * not move when a trade settles, and setting it re-bases every percentage in
 * the stats, which is why the rebuild runs afterwards.
 */
export async function setBaseValue(userId: ObjectId, number: number, baseValue: number): Promise<WithId<PortfolioDoc>> {
    await ensurePortfolio(userId, number);
    await collection().updateOne({ userId, number }, { $set: { baseValue, updatedAt: new Date() } });

    await rebuild(userId, number);
    return getPortfolio(userId, number);
}

export async function setLeverage(userId: ObjectId, number: number, leverage: number): Promise<number> {
    if (leverage < 1 || leverage > config.limits.maxLeverage) {
        throw new AppError(422, 'VALIDATION_FAILED', 'leverage out of range', {
            params: { min: 1, max: config.limits.maxLeverage },
        });
    }

    await ensurePortfolio(userId, number);
    await validateLog(await readTrades(userId, number), leverage);

    await collection().updateOne({ userId, number }, { $set: { leverage, updatedAt: new Date() } });
    await rebuild(userId, number);
    return leverage;
}

export async function setDefaultCommission(userId: ObjectId, number: number, commission: number): Promise<number> {
    await ensurePortfolio(userId, number);
    await collection().updateOne(
        { userId, number },
        { $set: { defaultCommission: commission, updatedAt: new Date() } },
    );
    return commission;
}

/**
 * Write settings straight through, without replaying the log against them.
 * Only the import path uses this, and only because the log those settings have
 * to hold up is the one arriving in the same request — validating against the
 * book being replaced would reject a file that is perfectly consistent with
 * itself. Every other caller goes through `setLeverage`, which does replay.
 */
export async function writeSettings(userId: ObjectId, number: number, settings: PortfolioSettings): Promise<void> {
    const benchmarks = settings.benchmarks === undefined ? undefined : [...new Set(settings.benchmarks)];
    const set = {
        ...(settings.baseValue !== undefined ? { baseValue: settings.baseValue } : {}),
        ...(settings.leverage !== undefined ? { leverage: settings.leverage } : {}),
        ...(settings.defaultCommission !== undefined ? { defaultCommission: settings.defaultCommission } : {}),
        ...(benchmarks !== undefined ? { benchmarks } : {}),
    };
    if (Object.keys(set).length === 0) return;

    if (benchmarks !== undefined) await Promise.all(benchmarks.map((symbol) => requireAsset(symbol)));

    await ensurePortfolio(userId, number);
    await collection().updateOne({ userId, number }, { $set: { ...set, updatedAt: new Date() } });
}

/**
 * Overwrite the derived fields with values the caller declared.
 * Ereuna is a simulator: a portfolio brought in from elsewhere may carry a
 * performance record its trade log cannot reproduce, and that record is the
 * user's to state. Written after the rebuild so a declared value wins over the
 * replayed one — and replaced by the replay again the next time a trade is
 * written, because from that point the log is the thing being measured.
 */
export async function applyDeclaredState(userId: ObjectId, number: number, declared: DeclaredState): Promise<void> {
    const set = {
        ...(declared.stats !== undefined ? { stats: declared.stats } : {}),
        ...(declared.valueHistory !== undefined ? { valueHistory: declared.valueHistory } : {}),
    };
    if (Object.keys(set).length === 0) return;

    await collection().updateOne({ userId, number }, { $set: { ...set, updatedAt: new Date() } });
}

export async function setBenchmarks(userId: ObjectId, number: number, symbols: readonly string[]): Promise<string[]> {
    if (symbols.length > config.limits.benchmarksPerPortfolio) {
        throw new AppError(422, 'BENCHMARK_LIMIT_REACHED', 'too many benchmarks', {
            params: { max: config.limits.benchmarksPerPortfolio },
        });
    }

    // Reference data is checked before the write, so a benchmark can never be a
    // symbol that will silently produce no series on the summary.
    const unique = [...new Set(symbols)];
    await Promise.all(unique.map((symbol) => requireAsset(symbol)));

    await ensurePortfolio(userId, number);
    await collection().updateOne({ userId, number }, { $set: { benchmarks: unique, updatedAt: new Date() } });

    return unique;
}

/** Delete a portfolio and everything derived from it. */
export async function deletePortfolio(userId: ObjectId, number: number): Promise<void> {
    const db = getDb();
    const result = await collection().deleteOne({ userId, number });
    if (result.deletedCount === 0) throw new AppError(404, 'PORTFOLIO_NOT_FOUND', `portfolio ${number} not found`);

    await Promise.all([
        db.collection<PositionDoc>('Positions').deleteMany({ userId, portfolioNumber: number }),
        db.collection<TradeDoc>('Trades').deleteMany({ userId, portfolioNumber: number }),
    ]);
}

function collection(): Collection<PortfolioDoc> {
    return getDb().collection<PortfolioDoc>('Portfolios');
}
