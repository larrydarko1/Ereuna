import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { PositionDoc } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const state: {
    portfolio: Record<string, unknown>;
    trades: { tradeDate: Date }[];
    closes: Map<string, number>;
    inception: Map<string, number | null>;
} = {
    portfolio: {},
    trades: [],
    closes: new Map(),
    inception: new Map(),
};

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/services/market/index.js', () => ({
    latestCloses: (symbols: string[]) =>
        Promise.resolve(new Map(symbols.flatMap((s) => (state.closes.has(s) ? [[s, state.closes.get(s)]] : [])))),
    closeOnOrAfter: (symbol: string) => Promise.resolve(state.inception.get(symbol) ?? null),
}));
vi.mock('@/services/portfolio/portfolio-crud.js', () => ({
    getPortfolio: () => Promise.resolve(state.portfolio),
}));
vi.mock('@/services/portfolio/portfolio-rebuild.js', () => ({
    readTrades: () => Promise.resolve(state.trades),
}));

const { exportPortfolio, getSummary } = await import('@/services/portfolio/portfolio-summary.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

function portfolio(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        number: 0,
        cash: 1_000,
        baseValue: 10_000,
        leverage: 2,
        defaultCommission: 0,
        benchmarks: [],
        stats: null,
        valueHistory: [],
        ...overrides,
    };
}

function position(overrides: Partial<PositionDoc> = {}): PositionDoc {
    return {
        userId: USER_ID,
        portfolioNumber: 0,
        symbol: 'AAPL',
        side: 'long',
        shares: 10,
        avgPrice: 100,
        updatedAt: new Date(),
        ...overrides,
    } as PositionDoc;
}

beforeEach(() => {
    db.current = fakeDb({ Positions: [] });
    state.portfolio = portfolio();
    state.trades = [];
    state.closes = new Map();
    state.inception = new Map();
});

describe('getSummary', () => {
    it("reads only this user's positions for this slot", async () => {
        await getSummary(USER_ID, 0);
        expect(db.current.of('Positions').filters[0]).toEqual({ userId: USER_ID, portfolioNumber: 0 });
    });

    it('values a long at the latest close', async () => {
        db.current = fakeDb({ Positions: [position()] });
        state.closes = new Map([['AAPL', 120]]);

        const summary = await getSummary(USER_ID, 0);
        expect(summary.positions[0]).toMatchObject({
            lastClose: 120,
            marketValue: 1_200,
            exposure: 1_200,
            unrealizedPL: 200,
            unrealizedPLPercent: 20,
        });
    });

    it('makes a short profit as the price falls, and gives it a negative exposure', async () => {
        db.current = fakeDb({ Positions: [position({ side: 'short' })] });
        state.closes = new Map([['AAPL', 80]]);

        const summary = await getSummary(USER_ID, 0);
        expect(summary.positions[0]).toMatchObject({
            marketValue: 800,
            exposure: -800,
            unrealizedPL: 200,
            unrealizedPLPercent: 20,
        });
    });

    it('leaves everything about a position null when the ingestor has no bar for it', async () => {
        db.current = fakeDb({ Positions: [position({ symbol: 'NEWCO' })] });

        const summary = await getSummary(USER_ID, 0);
        expect(summary.positions[0]).toMatchObject({
            lastClose: null,
            marketValue: null,
            exposure: null,
            unrealizedPL: null,
            unrealizedPLPercent: null,
            weight: null,
        });
    });

    it('reports no percentage for a position that cost nothing', async () => {
        db.current = fakeDb({ Positions: [position({ avgPrice: 0 })] });
        state.closes = new Map([['AAPL', 120]]);
        const summary = await getSummary(USER_ID, 0);
        expect(summary.positions[0]?.unrealizedPLPercent).toBeNull();
    });

    it('measures gross exposure across both sides and net exposure between them', async () => {
        db.current = fakeDb({
            Positions: [position(), position({ symbol: 'TSLA', side: 'short', shares: 5, avgPrice: 100 })],
        });
        state.closes = new Map([
            ['AAPL', 100],
            ['TSLA', 100],
        ]);

        const summary = await getSummary(USER_ID, 0);
        expect(summary).toMatchObject({ longValue: 1_000, shortValue: 500, grossExposure: 1_500, netExposure: 500 });
    });

    it('reports equity as cash plus net exposure', async () => {
        db.current = fakeDb({ Positions: [position()] });
        state.closes = new Map([['AAPL', 100]]);
        await expect(getSummary(USER_ID, 0).then((s) => s.totalValue)).resolves.toBe(2_000);
    });

    it('weights each position by its share of gross exposure', async () => {
        db.current = fakeDb({
            Positions: [position(), position({ symbol: 'TSLA', shares: 10, avgPrice: 100 })],
        });
        state.closes = new Map([
            ['AAPL', 100],
            ['TSLA', 300],
        ]);

        const summary = await getSummary(USER_ID, 0);
        expect(summary.positions.map((p) => p.weight)).toEqual([25, 75]);
    });

    it('leaves the leverage used unknown when equity is not positive', async () => {
        state.portfolio = portfolio({ cash: -5_000 });
        db.current = fakeDb({ Positions: [] });
        await expect(getSummary(USER_ID, 0).then((s) => s.leverageUsed)).resolves.toBeNull();
    });

    it('reports what is left before the leverage limit binds, never below zero', async () => {
        db.current = fakeDb({ Positions: [position()] });
        state.closes = new Map([['AAPL', 100]]);
        // Equity 2000 at 2:1 is 4000 of room, 1000 of it used
        await expect(getSummary(USER_ID, 0).then((s) => s.buyingPower)).resolves.toBe(3_000);
    });

    it('reports no buying power rather than a negative number when the limit is exceeded', async () => {
        state.portfolio = portfolio({ cash: -900, leverage: 1 });
        db.current = fakeDb({ Positions: [position()] });
        state.closes = new Map([['AAPL', 100]]);
        await expect(getSummary(USER_ID, 0).then((s) => s.buyingPower)).resolves.toBe(0);
    });

    it('measures total profit against the declared base value', async () => {
        state.portfolio = portfolio({ cash: 11_000, baseValue: 10_000 });
        db.current = fakeDb({ Positions: [] });

        const summary = await getSummary(USER_ID, 0);
        expect(summary.totalPL).toBe(1_000);
        expect(summary.totalPLPercent).toBe(10);
    });

    it('reports no total profit when no base value has been declared', async () => {
        state.portfolio = portfolio({ baseValue: 0 });
        db.current = fakeDb({ Positions: [] });

        const summary = await getSummary(USER_ID, 0);
        expect(summary.totalPL).toBeNull();
        expect(summary.totalPLPercent).toBeNull();
    });

    it('carries the stored stats and value history through unchanged', async () => {
        const stats = { totalReturn: 1 } as never;
        state.portfolio = portfolio({ stats, valueHistory: [{ date: '2026-01-01', value: 1 }] });
        db.current = fakeDb({ Positions: [] });

        const summary = await getSummary(USER_ID, 0);
        expect(summary.stats).toBe(stats);
        expect(summary.valueHistory).toEqual([{ date: '2026-01-01', value: 1 }]);
    });
});

describe('the benchmarks', () => {
    beforeEach(() => {
        state.portfolio = portfolio({ benchmarks: ['SPY'], cash: 11_000 });
        db.current = fakeDb({ Positions: [] });
        state.trades = [{ tradeDate: new Date('2026-01-02T00:00:00.000Z') }];
        state.closes = new Map([['SPY', 120]]);
        state.inception = new Map([['SPY', 100]]);
    });

    it("measures each benchmark over the portfolio's own lifetime", async () => {
        const summary = await getSummary(USER_ID, 0);
        expect(summary.benchmarks[0]).toEqual({
            symbol: 'SPY',
            inceptionPrice: 100,
            currentPrice: 120,
            returnPercent: 20,
            portfolioReturnPercent: 10,
            outperformance: -10,
        });
    });

    it('reports none when the portfolio declares no base value to compare against', async () => {
        state.portfolio = portfolio({ benchmarks: ['SPY'], baseValue: 0 });
        await expect(getSummary(USER_ID, 0).then((s) => s.benchmarks)).resolves.toEqual([]);
    });

    it('reports none when the portfolio has never traded', async () => {
        state.trades = [];
        await expect(getSummary(USER_ID, 0).then((s) => s.benchmarks)).resolves.toEqual([]);
    });

    it('reports none when no benchmark is set', async () => {
        state.portfolio = portfolio({ benchmarks: [], cash: 11_000 });
        await expect(getSummary(USER_ID, 0).then((s) => s.benchmarks)).resolves.toEqual([]);
    });

    it.each([
        ['no bar at inception', new Map([['SPY', null]]), new Map([['SPY', 120]])],
        ['a zero price at inception', new Map([['SPY', 0]]), new Map([['SPY', 120]])],
        ['no current price', new Map([['SPY', 100]]), new Map()],
    ])('omits a benchmark with %s rather than reporting it as flat', async (_label, inception, closes) => {
        state.inception = inception as Map<string, number | null>;
        state.closes = closes as Map<string, number>;
        await expect(getSummary(USER_ID, 0).then((s) => s.benchmarks)).resolves.toEqual([]);
    });
});

describe('exportPortfolio', () => {
    it("carries the settings and the whole log, and nothing derived from today's market", async () => {
        state.portfolio = portfolio({ benchmarks: ['SPY'] });
        state.trades = [
            {
                _id: new ObjectId(),
                symbol: 'AAPL',
                action: 'buy',
                shares: 1,
                price: 1,
                total: 1,
                commission: 0,
                tradeDate: new Date('2026-01-02T00:00:00.000Z'),
                createdAt: new Date('2026-01-02T00:00:00.000Z'),
            } as never,
        ];

        const exported = await exportPortfolio(USER_ID, 0);
        expect(exported.portfolio).toEqual({
            baseValue: 10_000,
            leverage: 2,
            defaultCommission: 0,
            benchmarks: ['SPY'],
            stats: null,
            valueHistory: [],
        });
        expect(exported.trades).toHaveLength(1);
        expect(exported.trades[0]).not.toHaveProperty('userId');
    });

    it('exports an empty log as an empty list', async () => {
        await expect(exportPortfolio(USER_ID, 0).then((e) => e.trades)).resolves.toEqual([]);
    });
});
