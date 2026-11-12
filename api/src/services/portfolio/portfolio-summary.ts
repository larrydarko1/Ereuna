/**
 * portfolio-summary — the valued view of a portfolio, and its export.
 * Everything here is read-only. The stored document holds what the trade log
 * implies (cash, positions, realised stats); this module adds what only the
 * market can say (position values, unrealised P/L, benchmark returns). The
 * summary prices at the latest close; the live feed passes the session's latest
 * trades to the same valuation, so the two cannot disagree on how a number is made.
 *
 * Owns: the summary, the live valuation's arithmetic, the export.
 * Does NOT own: replaying the log (services/portfolio/portfolio-rebuild.ts),
 * pushing a valuation to a socket (gateway/portfolio-watch.ts).
 */
import type { ObjectId } from 'mongodb';

import type {
    BenchmarkResult,
    PortfolioDoc,
    PortfolioExport,
    PortfolioSummary,
    PortfolioValuation,
    PositionDoc,
    TradeDoc,
    TradeInput,
    ValuedPosition,
} from '@ereuna/shared';

import { AppError } from '@/lib/app-error.js';
import { getDb } from '@/lib/db.js';
import { closeOnOrAfter, latestCloses } from '@/services/market/index.js';
import { findPortfolio, getPortfolio } from '@/services/portfolio/portfolio-crud.js';
import { readTrades } from '@/services/portfolio/portfolio-rebuild.js';

/** What a valuation needs from the store: the settled slot, its open positions, and each one's latest close. */
export type Holdings = {
    portfolio: Pick<PortfolioDoc, 'number' | 'cash' | 'baseValue' | 'leverage'>;
    positions: PositionDoc[];
    closes: ReadonlyMap<string, number>;
};

/** What a position is priced at, and whether that is a trade from the session in progress. */
type Mark = { price: number; live: boolean };

export async function getSummary(userId: ObjectId, number: number): Promise<PortfolioSummary> {
    const portfolio = await getPortfolio(userId, number);
    const holdings = await readHoldings(userId, portfolio);
    const valuation = valuePortfolio(holdings, new Map());

    return {
        ...valuation,
        cash: portfolio.cash,
        baseValue: portfolio.baseValue,
        leverage: portfolio.leverage,
        defaultCommission: portfolio.defaultCommission,
        stats: portfolio.stats,
        valueHistory: portfolio.valueHistory,
        benchmarks: await benchmarkResults(userId, number, portfolio.benchmarks, valuation.totalPLPercent),
    };
}

/** The slot and what it holds, or null for a slot nobody has written to. */
export async function findHoldings(userId: ObjectId, number: number): Promise<Holdings | null> {
    const portfolio = await findPortfolio(userId, number);
    return portfolio === null ? null : readHoldings(userId, portfolio);
}

/**
 * Price the holdings: each symbol at its live price where there is one, else at
 * its latest close. Gross exposure is longs plus shorts, which is what the
 * leverage limit is measured against; equity is cash plus net exposure.
 */
export function valuePortfolio(holdings: Holdings, live: ReadonlyMap<string, number>): PortfolioValuation {
    const { portfolio, positions, closes } = holdings;
    const valued = positions.map((position) => valuePosition(position, markOf(position.symbol, live, closes)));

    const longValue = sum(valued.filter((p) => p.side === 'long').map((p) => p.marketValue ?? 0));
    const shortValue = sum(valued.filter((p) => p.side === 'short').map((p) => p.marketValue ?? 0));
    const grossExposure = longValue + shortValue;
    const netExposure = longValue - shortValue;

    const totalValue = round2(netExposure + portfolio.cash);
    const hasBase = portfolio.baseValue > 0;
    const totalPL = hasBase ? round2(totalValue - portfolio.baseValue) : null;
    const totalPLPercent = totalPL === null ? null : round2((totalPL / portfolio.baseValue) * 100);

    return {
        number: portfolio.number,
        positions: valued.map((position) => ({
            ...position,
            weight:
                position.marketValue === null || grossExposure === 0
                    ? null
                    : round2((position.marketValue / grossExposure) * 100),
        })),
        longValue: round2(longValue),
        shortValue: round2(shortValue),
        grossExposure: round2(grossExposure),
        netExposure: round2(netExposure),
        totalValue,
        leverageUsed: totalValue > 0 ? round2(grossExposure / totalValue) : null,
        buyingPower: round2(Math.max(0, totalValue * portfolio.leverage - grossExposure)),
        unrealizedPL: round2(sum(valued.map((position) => position.unrealizedPL ?? 0))),
        totalPL,
        totalPLPercent,
    };
}

export async function exportPortfolio(userId: ObjectId, number: number): Promise<PortfolioExport> {
    const [portfolio, trades] = await Promise.all([getPortfolio(userId, number), readTrades(userId, number)]);

    return {
        portfolio: {
            baseValue: portfolio.baseValue,
            leverage: portfolio.leverage,
            defaultCommission: portfolio.defaultCommission,
            benchmarks: portfolio.benchmarks,
            stats: portfolio.stats,
            valueHistory: portfolio.valueHistory,
        },
        trades: trades.map(toExportedTrade),
    };
}

/** Cash movements name no instrument, no share count and no price. */
function toExportedTrade(doc: TradeDoc): TradeInput {
    const movement = { total: doc.total, commission: doc.commission, tradeDate: doc.tradeDate.toISOString() };
    if (doc.action === 'deposit' || doc.action === 'withdrawal') return { action: doc.action, ...movement };
    // Only a write that skipped the trade schema leaves a trade without its instrument
    if (doc.symbol === null) throw new AppError(500, 'INTERNAL', 'A stored trade names no symbol');
    return { action: doc.action, symbol: doc.symbol, shares: doc.shares, price: doc.price, ...movement };
}

async function readHoldings(
    userId: ObjectId,
    portfolio: Pick<PortfolioDoc, 'number' | 'cash' | 'baseValue' | 'leverage'>,
): Promise<Holdings> {
    const positions = await getDb()
        .collection<PositionDoc>('Positions')
        .find({ userId, portfolioNumber: portfolio.number })
        .sort({ symbol: 1 })
        .toArray();
    const closes = await latestCloses(positions.map((position) => position.symbol));
    return { portfolio, positions, closes };
}

/** The price a symbol is marked at: the session's latest trade, else the latest close, else none yet. */
function markOf(symbol: string, live: ReadonlyMap<string, number>, closes: ReadonlyMap<string, number>): Mark | null {
    const trade = live.get(symbol);
    if (trade !== undefined) return { price: trade, live: true };
    const close = closes.get(symbol);
    return close === undefined ? null : { price: close, live: false };
}

/**
 * Price one position.
 * A short profits as the price falls, so its unrealised P/L is the entry minus
 * the mark; both sides divide by the same committed capital, so a 10% move is
 * 10% either way round.
 */
function valuePosition(position: PositionDoc, mark: Mark | null): ValuedPosition {
    const base = {
        symbol: position.symbol,
        side: position.side,
        shares: position.shares,
        avgPrice: round2(position.avgPrice),
        live: mark?.live ?? false,
    };

    if (mark === null) {
        return {
            ...base,
            price: null,
            marketValue: null,
            exposure: null,
            unrealizedPL: null,
            unrealizedPLPercent: null,
            weight: null,
        };
    }

    const { price } = mark;
    const marketValue = price * position.shares;
    const cost = position.avgPrice * position.shares;
    const unrealizedPL = position.side === 'long' ? marketValue - cost : cost - marketValue;

    return {
        ...base,
        price,
        marketValue: round2(marketValue),
        exposure: round2(position.side === 'long' ? marketValue : -marketValue),
        unrealizedPL: round2(unrealizedPL),
        unrealizedPLPercent: cost === 0 ? null : round2((unrealizedPL / cost) * 100),
        weight: null,
    };
}

/**
 * How each benchmark performed over the portfolio's own lifetime.
 * Inception is the first trade's date, so the comparison covers the period the
 * portfolio was actually invested rather than an arbitrary calendar window. A
 * benchmark with no bar at inception is omitted rather than reported as flat.
 */
async function benchmarkResults(
    userId: ObjectId,
    number: number,
    symbols: readonly string[],
    portfolioReturnPercent: number | null,
): Promise<BenchmarkResult[]> {
    if (symbols.length === 0 || portfolioReturnPercent === null) return [];

    const [first] = await readTrades(userId, number);
    if (first === undefined) return [];

    const closes = await latestCloses(symbols);
    const results = await Promise.all(
        symbols.map(async (symbol): Promise<BenchmarkResult[]> => {
            const inception = await closeOnOrAfter(symbol, first.tradeDate);
            const current = closes.get(symbol);
            if (inception === null || inception === 0 || current === undefined) return [];

            const returnPercent = round2(((current - inception) / inception) * 100);
            return [
                {
                    symbol,
                    inceptionPrice: round2(inception),
                    currentPrice: round2(current),
                    returnPercent,
                    portfolioReturnPercent,
                    outperformance: round2(portfolioReturnPercent - returnPercent),
                },
            ];
        }),
    );

    return results.flat();
}

function sum(values: readonly number[]): number {
    return values.reduce((total, value) => total + value, 0);
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}
