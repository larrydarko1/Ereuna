import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId, type WithId } from 'mongodb';
import type { TradeDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const calls: {
    rebuilt: number;
    assets: string[];
    validated: { trades: { symbol: string | null; createdAt: Date }[]; leverage: number }[];
    settings: unknown[];
    declared: unknown[];
} = { rebuilt: 0, assets: [], validated: [], settings: [], declared: [] };
const state: { existing: WithId<TradeDoc>[]; unknownSymbols: Set<string>; violation: AppError | null } = {
    existing: [],
    unknownSymbols: new Set(),
    violation: null,
};

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/services/market/index.js', () => ({
    getAsset: (symbol: string) => {
        calls.assets.push(symbol);
        if (state.unknownSymbols.has(symbol)) {
            return Promise.reject(new AppError(404, 'ASSET_NOT_FOUND', `${symbol} not found`));
        }
        return Promise.resolve({ Symbol: symbol });
    },
}));
vi.mock('@/services/portfolio/portfolio-rebuild.js', () => ({
    readTrades: () => Promise.resolve(state.existing),
    rebuild: () => {
        calls.rebuilt += 1;
        return Promise.resolve({});
    },
    validateLog: (trades: { symbol: string | null; createdAt: Date }[], leverage: number) => {
        calls.validated.push({ trades, leverage });
        return state.violation === null ? Promise.resolve() : Promise.reject(state.violation);
    },
}));
vi.mock('@/services/portfolio/portfolio-crud.js', () => ({
    getOrCreatePortfolio: () => Promise.resolve({ _id: new ObjectId(), leverage: 2, defaultCommission: 4.95 }),
    writeSettings: (_u: unknown, _n: unknown, settings: unknown) => {
        calls.settings.push(settings);
        return Promise.resolve();
    },
    applyDeclaredState: (_u: unknown, _n: unknown, declared: unknown) => {
        calls.declared.push(declared);
        return Promise.resolve();
    },
}));

const { addTrade, deleteTrade, getTradePage, replaceTrades, toTradeRow, updateTrade } =
    await import('@/services/portfolio/portfolio-trades.js');
const { config } = await import('@/lib/config.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');
const TRADE_ID = new ObjectId('507f191e810c19729de860ea');

const YESTERDAY = new Date(Date.now() - 86_400_000);

function input(overrides: Record<string, unknown> = {}): Parameters<typeof addTrade>[2] {
    return {
        symbol: 'AAPL',
        action: 'buy',
        shares: 10,
        price: 100,
        total: 1_000,
        commission: null,
        tradeDate: YESTERDAY,
        ...overrides,
    } as Parameters<typeof addTrade>[2];
}

function stored(overrides: Partial<TradeDoc> = {}): WithId<TradeDoc> {
    return {
        _id: TRADE_ID,
        userId: USER_ID,
        portfolioNumber: 0,
        symbol: 'AAPL',
        action: 'buy',
        shares: 10,
        price: 100,
        total: 1_000,
        commission: 0,
        tradeDate: YESTERDAY,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        ...overrides,
    } as WithId<TradeDoc>;
}

beforeEach(() => {
    db.current = fakeDb({ Trades: [] });
    calls.rebuilt = 0;
    calls.assets = [];
    calls.validated = [];
    calls.settings = [];
    calls.declared = [];
    state.existing = [];
    state.unknownSymbols = new Set();
    state.violation = null;
});

describe('toTradeRow', () => {
    it('renders the id as a string and drops the ownership fields', () => {
        expect(toTradeRow(stored())).toEqual({
            id: TRADE_ID.toHexString(),
            symbol: 'AAPL',
            action: 'buy',
            shares: 10,
            price: 100,
            total: 1_000,
            commission: 0,
            tradeDate: YESTERDAY,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        });
    });
});

describe('getTradePage', () => {
    it('reads one portfolio for one user', async () => {
        await getTradePage(USER_ID, 0, { page: 1, limit: 10 });
        expect(db.current.of('Trades').filters[0]).toEqual({ userId: USER_ID, portfolioNumber: 0 });
    });

    it('narrows to one symbol when asked', async () => {
        await getTradePage(USER_ID, 0, { page: 1, limit: 10, symbol: 'AAPL' });
        expect(db.current.of('Trades').filters[0]).toEqual({ userId: USER_ID, portfolioNumber: 0, symbol: 'AAPL' });
    });

    it('reports the page it served alongside the total', async () => {
        db.current = fakeDb({ Trades: [stored(), stored()] });
        await expect(getTradePage(USER_ID, 0, { page: 2, limit: 10 })).resolves.toMatchObject({
            total: 2,
            page: 2,
            limit: 10,
        });
    });

    it('renders the rows rather than the raw documents', async () => {
        db.current = fakeDb({ Trades: [stored()] });
        const page = await getTradePage(USER_ID, 0, { page: 1, limit: 10 });
        expect(page.items[0]).not.toHaveProperty('userId');
        expect(page.items[0]?.id).toBe(TRADE_ID.toHexString());
    });
});

describe('addTrade', () => {
    it('validates the candidate log, then writes and rebuilds', async () => {
        await addTrade(USER_ID, 0, input());

        expect(calls.validated[0]?.trades).toHaveLength(1);
        expect(calls.validated[0]?.leverage).toBe(2);
        expect(db.current.of('Trades').writes[0]?.method).toBe('insertOne');
        expect(calls.rebuilt).toBe(1);
    });

    it('validates against the whole log, so a back-dated trade is checked in its own place', async () => {
        state.existing = [stored()];
        await addTrade(USER_ID, 0, input({ tradeDate: new Date('2020-01-01T00:00:00.000Z') }));
        expect(calls.validated[0]?.trades).toHaveLength(2);
    });

    it('settles the default commission onto the row, so a later change cannot re-price it', async () => {
        await addTrade(USER_ID, 0, input({ commission: null }));
        const document = db.current.of('Trades').writes[0]?.args[0] as { commission: number };
        expect(document.commission).toBe(4.95);
    });

    it('keeps a commission the client stated', async () => {
        await addTrade(USER_ID, 0, input({ commission: 0 }));
        const document = db.current.of('Trades').writes[0]?.args[0] as { commission: number };
        expect(document.commission).toBe(0);
    });

    it('checks the symbol exists', async () => {
        state.unknownSymbols = new Set(['NOPE']);
        await expect(addTrade(USER_ID, 0, input({ symbol: 'NOPE' }))).rejects.toMatchObject({
            code: 'ASSET_NOT_FOUND',
        });
        expect(db.current.of('Trades').writes).toEqual([]);
    });

    it('looks up no symbol for a cash movement', async () => {
        await addTrade(USER_ID, 0, input({ symbol: null, action: 'deposit' }));
        expect(calls.assets).toEqual([]);
    });

    it('refuses a future-dated trade — it would price against bars that do not exist', async () => {
        const tomorrow = new Date(Date.now() + 86_400_000);
        await expect(addTrade(USER_ID, 0, input({ tradeDate: tomorrow }))).rejects.toMatchObject({
            code: 'INVALID_TRADE_DATE',
        });
    });

    it('refuses once the log is at the trade limit', async () => {
        state.existing = Array.from({ length: config.limits.tradesPerPortfolio }, () => stored());
        await expect(addTrade(USER_ID, 0, input())).rejects.toMatchObject({ code: 'TRADE_LIMIT_REACHED' });
    });

    it('writes nothing when the candidate log does not hold up', async () => {
        state.violation = new AppError(422, 'INSUFFICIENT_BUYING_POWER', 'short');
        await expect(addTrade(USER_ID, 0, input())).rejects.toMatchObject({ code: 'INSUFFICIENT_BUYING_POWER' });
        expect(db.current.of('Trades').writes).toEqual([]);
        expect(calls.rebuilt).toBe(0);
    });

    it('returns the row the client can render immediately', async () => {
        db.current.of('Trades').results.insertOne = { acknowledged: true, insertedId: TRADE_ID };
        await expect(addTrade(USER_ID, 0, input())).resolves.toMatchObject({
            id: TRADE_ID.toHexString(),
            symbol: 'AAPL',
            commission: 4.95,
        });
    });
});

describe('updateTrade', () => {
    beforeEach(() => {
        db.current = fakeDb({ Trades: [stored()] });
        state.existing = [stored()];
    });

    it('replays the log with the edit swapped in for the original', async () => {
        await updateTrade(USER_ID, 0, TRADE_ID, input({ shares: 5, total: 500 }));
        const candidate = calls.validated[0]?.trades ?? [];
        expect(candidate).toHaveLength(1);
        expect(db.current.of('Trades').writes[0]?.method).toBe('updateOne');
        expect(calls.rebuilt).toBe(1);
    });

    it('keeps the original creation time, so same-day ordering does not shift', async () => {
        await updateTrade(USER_ID, 0, TRADE_ID, input());
        expect(calls.validated[0]?.trades[0]?.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    });

    it('scopes the write to the owner as well as the id', async () => {
        await updateTrade(USER_ID, 0, TRADE_ID, input());
        expect(db.current.of('Trades').writes[0]?.args[0]).toEqual({
            _id: TRADE_ID,
            userId: USER_ID,
            portfolioNumber: 0,
        });
    });

    it('refuses a trade that is not there', async () => {
        db.current = fakeDb({ Trades: [] });
        db.current.of('Trades').results.findOne = null;
        await expect(updateTrade(USER_ID, 0, TRADE_ID, input())).rejects.toMatchObject({ code: 'TRADE_NOT_FOUND' });
    });

    it('refuses a future date', async () => {
        const tomorrow = new Date(Date.now() + 86_400_000);
        await expect(updateTrade(USER_ID, 0, TRADE_ID, input({ tradeDate: tomorrow }))).rejects.toMatchObject({
            code: 'INVALID_TRADE_DATE',
        });
    });

    it('writes nothing when the edited log does not hold up', async () => {
        state.violation = new AppError(422, 'INSUFFICIENT_SHARES', 'short');
        await expect(updateTrade(USER_ID, 0, TRADE_ID, input())).rejects.toThrow();
        expect(db.current.of('Trades').writes).toEqual([]);
    });
});

describe('deleteTrade', () => {
    beforeEach(() => {
        db.current = fakeDb({ Trades: [stored()] });
        state.existing = [stored()];
    });

    it('replays the log without the trade before removing it', async () => {
        await deleteTrade(USER_ID, 0, TRADE_ID);
        expect(calls.validated[0]?.trades).toEqual([]);
        expect(db.current.of('Trades').writes[0]?.method).toBe('deleteOne');
        expect(calls.rebuilt).toBe(1);
    });

    it('refuses to delete a trade that would leave the log inconsistent', async () => {
        state.violation = new AppError(422, 'INSUFFICIENT_BUYING_POWER', 'short');
        await expect(deleteTrade(USER_ID, 0, TRADE_ID)).rejects.toThrow();
        expect(db.current.of('Trades').writes).toEqual([]);
    });

    it('refuses a trade that is not there', async () => {
        db.current = fakeDb({ Trades: [] });
        db.current.of('Trades').results.findOne = null;
        await expect(deleteTrade(USER_ID, 0, TRADE_ID)).rejects.toMatchObject({ code: 'TRADE_NOT_FOUND' });
    });
});

describe('replaceTrades', () => {
    it('writes the settings first, because they are what the incoming log is judged by', async () => {
        await replaceTrades(USER_ID, 0, [input()], { settings: { leverage: 4 } });
        expect(calls.settings).toEqual([{ leverage: 4 }]);
    });

    it('replays the whole file before anything is written', async () => {
        state.violation = new AppError(422, 'INSUFFICIENT_BUYING_POWER', 'short');
        await expect(replaceTrades(USER_ID, 0, [input()])).rejects.toThrow();
        expect(db.current.of('Trades').writes).toEqual([]);
        expect(calls.rebuilt).toBe(0);
    });

    it('replaces the log and reports how many rows it stored', async () => {
        await expect(replaceTrades(USER_ID, 0, [input(), input()])).resolves.toBe(2);
        const writes = db.current.of('Trades').writes;
        expect(writes[0]?.method).toBe('deleteMany');
        expect(writes[1]?.method).toBe('insertMany');
    });

    it('clears the log for an empty import without inserting anything', async () => {
        await expect(replaceTrades(USER_ID, 0, [])).resolves.toBe(0);
        expect(db.current.of('Trades').writes.map((w) => w.method)).toEqual(['deleteMany']);
    });

    it('orders same-day rows by their position in the file', async () => {
        await replaceTrades(USER_ID, 0, [input(), input(), input()]);
        const times = calls.validated[0]?.trades.map((trade) => trade.createdAt.getTime()) ?? [];
        expect([...times].sort((a, b) => a - b)).toEqual(times);
        expect(new Set(times).size).toBe(3);
    });

    it('checks each distinct symbol once', async () => {
        await replaceTrades(USER_ID, 0, [input(), input(), input({ symbol: 'MSFT' })]);
        expect(calls.assets).toEqual(['AAPL', 'MSFT']);
    });

    it('applies the declared record after the rebuild, so it wins over the replayed one', async () => {
        await replaceTrades(USER_ID, 0, [input()], { declared: { valueHistory: [] } });
        expect(calls.rebuilt).toBe(1);
        expect(calls.declared).toEqual([{ valueHistory: [] }]);
    });

    it('refuses a file longer than the trade limit', async () => {
        const many = Array.from({ length: config.limits.tradesPerPortfolio + 1 }, () => input());
        await expect(replaceTrades(USER_ID, 0, many)).rejects.toMatchObject({ code: 'TRADE_LIMIT_REACHED' });
    });

    it('refuses a file carrying a future-dated row', async () => {
        const tomorrow = new Date(Date.now() + 86_400_000);
        await expect(replaceTrades(USER_ID, 0, [input(), input({ tradeDate: tomorrow })])).rejects.toMatchObject({
            code: 'INVALID_TRADE_DATE',
        });
    });
});
