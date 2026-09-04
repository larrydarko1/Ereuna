/**
 * portfolio-summary — the valued view of a portfolio, and its export.
 * Everything here is read-only and priced at the latest close: the stored
 * document holds what the trade log implies (cash, positions, realised stats),
 * and this module adds what only today's market can say (position values,
 * unrealised P/L, benchmark returns).
 */
import type { ObjectId } from 'mongodb';
import type { PortfolioStatsSnapshot, PortfolioValuePoint, PositionDoc, PositionSide } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';
import { closeOnOrAfter, latestCloses } from '@/services/market/index.js';
import { getPortfolio } from '@/services/portfolio/portfolio-crud.js';
import { readTrades } from '@/services/portfolio/portfolio-rebuild.js';
import { toTradeRow, type TradeRow } from '@/services/portfolio/portfolio-trades.js';

export type PortfolioSummary = {
    number: number;
    cash: number; // Negative means the portfolio is carrying a margin loan
    baseValue: number;
    leverage: number;
    defaultCommission: number;
    positions: ValuedPosition[];
    longValue: number;
    shortValue: number;
    grossExposure: number; // Longs plus shorts — what the leverage limit is measured against
    netExposure: number; // Longs minus shorts — what the market direction is measured against
    totalValue: number; // Equity: cash plus net exposure
    leverageUsed: number | null;
    buyingPower: number; // What is left before the leverage limit binds
    unrealizedPL: number;
    totalPL: number | null;
    totalPLPercent: number | null;
    stats: PortfolioStatsSnapshot | null;
    valueHistory: PortfolioValuePoint[];
    benchmarks: BenchmarkResult[];
};

export type PortfolioExport = {
    portfolio: {
        baseValue: number;
        leverage: number;
        defaultCommission: number;
        benchmarks: string[];
        stats: PortfolioStatsSnapshot | null;
        valueHistory: PortfolioValuePoint[];
    };
    trades: TradeRow[];
};

type ValuedPosition = {
    symbol: string;
    side: PositionSide;
    shares: number;
    avgPrice: number;
    lastClose: number | null; // Null when the ingestor has no bar for the symbol yet
    marketValue: number | null; // Absolute value of the position — a short's is what it would cost to buy back
    exposure: number | null; // Signed contribution to equity: negative for a short
    unrealizedPL: number | null;
    unrealizedPLPercent: number | null;
    weight: number | null; // Share of gross exposure, in percent
};

type BenchmarkResult = {
    symbol: string;
    inceptionPrice: number;
    currentPrice: number;
    returnPercent: number;
    portfolioReturnPercent: number;
    outperformance: number;
};

export async function getSummary(userId: ObjectId, number: number): Promise<PortfolioSummary> {
    const portfolio = await getPortfolio(userId, number);
    const positions = await getDb()
        .collection<PositionDoc>('Positions')
        .find({ userId, portfolioNumber: number })
        .sort({ symbol: 1 })
        .toArray();

    const closes = await latestCloses(positions.map((position) => position.symbol));
    const valued = positions.map((position) => valuePosition(position, closes.get(position.symbol) ?? null));

    const longValue = sum(valued.filter((p) => p.side === 'long').map((p) => p.marketValue ?? 0));
    const shortValue = sum(valued.filter((p) => p.side === 'short').map((p) => p.marketValue ?? 0));
    const grossExposure = longValue + shortValue;
    const netExposure = longValue - shortValue;

    const totalValue = round2(netExposure + portfolio.cash);
    const hasBase = portfolio.baseValue > 0;
    const totalPL = hasBase ? round2(totalValue - portfolio.baseValue) : null;
    const totalPLPercent = totalPL === null ? null : round2((totalPL / portfolio.baseValue) * 100);

    return {
        number,
        cash: portfolio.cash,
        baseValue: portfolio.baseValue,
        leverage: portfolio.leverage,
        defaultCommission: portfolio.defaultCommission,
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
        stats: portfolio.stats,
        valueHistory: portfolio.valueHistory,
        benchmarks: await benchmarkResults(userId, number, portfolio.benchmarks, totalPLPercent),
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
        trades: trades.map(toTradeRow),
    };
}

/**
 * Price one position at the latest close.
 * A short profits as the price falls, so its unrealised P/L is the entry minus
 * the mark; both sides divide by the same committed capital, so a 10% move is
 * 10% either way round.
 */
function valuePosition(position: PositionDoc, lastClose: number | null): ValuedPosition {
    const base = {
        symbol: position.symbol,
        side: position.side,
        shares: position.shares,
        avgPrice: round2(position.avgPrice),
    };

    if (lastClose === null) {
        return {
            ...base,
            lastClose: null,
            marketValue: null,
            exposure: null,
            unrealizedPL: null,
            unrealizedPLPercent: null,
            weight: null,
        };
    }

    const marketValue = lastClose * position.shares;
    const cost = position.avgPrice * position.shares;
    const unrealizedPL = position.side === 'long' ? marketValue - cost : cost - marketValue;

    return {
        ...base,
        lastClose,
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
