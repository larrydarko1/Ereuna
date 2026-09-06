import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { AppError } from '@/lib/app-error.js';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const calls: { rebuilt: [string, number][]; assets: string[]; validated: { leverage: number }[] } = {
    rebuilt: [],
    assets: [],
    validated: [],
};
const state: { unknownSymbols: Set<string>; logViolation: AppError | null } = {
    unknownSymbols: new Set(),
    logViolation: null,
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
    readTrades: () => Promise.resolve([]),
    rebuild: (userId: ObjectId, number: number) => {
        calls.rebuilt.push([userId.toHexString(), number]);
        return Promise.resolve({});
    },
    validateLog: (_trades: unknown[], leverage: number) => {
        calls.validated.push({ leverage });
        return state.logViolation === null ? Promise.resolve() : Promise.reject(state.logViolation);
    },
}));

const {
    applyDeclaredState,
    deletePortfolio,
    getOrCreatePortfolio,
    getPortfolio,
    listPortfolios,
    setBaseValue,
    setBenchmarks,
    setDefaultCommission,
    setLeverage,
    writeSettings,
} = await import('@/services/portfolio/portfolio-crud.js');
const { config } = await import('@/lib/config.js');
const { DEFAULT_LEVERAGE } = await import('@/utils/portfolio-replay.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

function portfolio(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        _id: new ObjectId(),
        userId: USER_ID,
        number: 0,
        cash: 1_000,
        baseValue: 10_000,
        leverage: 1,
        defaultCommission: 0,
        benchmarks: [],
        stats: null,
        valueHistory: [],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        ...overrides,
    };
}

const setOf = (index = 0): Record<string, unknown> =>
    (
        db.current.of('Portfolios').writes.filter((w) => w.method === 'updateOne')[index]?.args[1] as {
            $set: Record<string, unknown>;
        }
    ).$set;

beforeEach(() => {
    db.current = fakeDb();
    calls.rebuilt = [];
    calls.assets = [];
    calls.validated = [];
    state.unknownSymbols = new Set();
    state.logViolation = null;
});

describe('listPortfolios', () => {
    it('returns only the slots the user has actually used', async () => {
        db.current = fakeDb({ Portfolios: [portfolio()], Positions: [] });
        const rows = await listPortfolios(USER_ID);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ number: 0, cash: 1_000, baseValue: 10_000, positionCount: 0 });
    });

    it('joins the open-position count per slot', async () => {
        db.current = fakeDb({
            Portfolios: [portfolio({ number: 0 }), portfolio({ number: 1 })],
            Positions: [{ _id: 1, count: 4 }],
        });
        const rows = await listPortfolios(USER_ID);
        expect(rows.map((row) => row.positionCount)).toEqual([0, 4]);
    });

    it('scopes both reads to the user', async () => {
        db.current = fakeDb({ Portfolios: [], Positions: [] });
        await listPortfolios(USER_ID);
        expect(db.current.of('Portfolios').filters[0]).toEqual({ userId: USER_ID });
        expect((db.current.of('Positions').filters[0] as { $match: unknown }[])[0]).toEqual({
            $match: { userId: USER_ID },
        });
    });

    it('returns nothing for a user with no portfolios', async () => {
        db.current = fakeDb({ Portfolios: [], Positions: [] });
        await expect(listPortfolios(USER_ID)).resolves.toEqual([]);
    });
});

describe('getPortfolio', () => {
    it('reads one slot for one user', async () => {
        db.current = fakeDb({ Portfolios: [portfolio()] });
        await getPortfolio(USER_ID, 0);
        expect(db.current.of('Portfolios').filters[0]).toEqual({ userId: USER_ID, number: 0 });
    });

    it('refuses a slot that does not exist', async () => {
        db.current = fakeDb({ Portfolios: [] });
        db.current.of('Portfolios').results.findOne = null;
        await expect(getPortfolio(USER_ID, 3)).rejects.toMatchObject({ code: 'PORTFOLIO_NOT_FOUND', status: 404 });
    });
});

describe('getOrCreatePortfolio', () => {
    it('creates the slot on first use, atomically', async () => {
        db.current = fakeDb({ Portfolios: [portfolio()] });
        await getOrCreatePortfolio(USER_ID, 0);

        const [filter, update, options] = db.current.of('Portfolios').writes[0]?.args ?? [];
        expect(filter).toEqual({ userId: USER_ID, number: 0 });
        expect(options).toEqual({ upsert: true, returnDocument: 'after' });
        expect(update).toMatchObject({ $setOnInsert: { cash: 0, baseValue: 0, leverage: DEFAULT_LEVERAGE } });
    });

    it('sets nothing on a slot that already exists', async () => {
        db.current = fakeDb({ Portfolios: [portfolio({ cash: 5_000 })] });
        const update = db.current.of('Portfolios');
        await getOrCreatePortfolio(USER_ID, 0);
        expect(Object.keys(update.writes[0]?.args[1] as object)).toEqual(['$setOnInsert']);
    });

    it('throws when the upsert somehow returns nothing', async () => {
        db.current = fakeDb({ Portfolios: [] });
        db.current.of('Portfolios').results.findOneAndUpdate = null;
        await expect(getOrCreatePortfolio(USER_ID, 0)).rejects.toThrow(AppError);
    });
});

describe('setBaseValue', () => {
    it('writes the denominator and re-derives every percentage from it', async () => {
        db.current = fakeDb({ Portfolios: [portfolio()] });
        await setBaseValue(USER_ID, 0, 50_000);

        expect(setOf().baseValue).toBe(50_000);
        expect(calls.rebuilt).toEqual([[USER_ID.toHexString(), 0]]);
    });

    it('opens the slot first, so a first deposit needs no separate create step', async () => {
        db.current = fakeDb({ Portfolios: [portfolio()] });
        await setBaseValue(USER_ID, 0, 1);
        expect(db.current.of('Portfolios').writes[0]?.method).toBe('findOneAndUpdate');
    });
});

describe('setLeverage', () => {
    beforeEach(() => {
        db.current = fakeDb({ Portfolios: [portfolio()] });
    });

    it('replays the existing log against the new ratio before writing it', async () => {
        await setLeverage(USER_ID, 0, 2);
        expect(calls.validated).toEqual([{ leverage: 2 }]);
        expect(setOf().leverage).toBe(2);
        expect(calls.rebuilt).toHaveLength(1);
    });

    it('refuses a ratio the existing log could not have been executed at', async () => {
        state.logViolation = new AppError(422, 'INSUFFICIENT_BUYING_POWER', 'short');
        await expect(setLeverage(USER_ID, 0, 1)).rejects.toMatchObject({ code: 'INSUFFICIENT_BUYING_POWER' });
        expect(db.current.of('Portfolios').writes.some((w) => w.method === 'updateOne')).toBe(false);
    });

    it.each([
        ['below one', 0.5],
        ['above the configured ceiling', config.limits.maxLeverage + 1],
    ])('refuses a ratio %s', async (_label, leverage) => {
        await expect(setLeverage(USER_ID, 0, leverage)).rejects.toMatchObject({
            code: 'VALIDATION_FAILED',
            status: 422,
        });
    });

    it('accepts exactly one and exactly the ceiling', async () => {
        await expect(setLeverage(USER_ID, 0, 1)).resolves.toBe(1);
        await expect(setLeverage(USER_ID, 0, config.limits.maxLeverage)).resolves.toBe(config.limits.maxLeverage);
    });
});

describe('setDefaultCommission', () => {
    it('writes the default without replaying anything — settled trades keep their own number', async () => {
        db.current = fakeDb({ Portfolios: [portfolio()] });
        await expect(setDefaultCommission(USER_ID, 0, 4.95)).resolves.toBe(4.95);
        expect(setOf().defaultCommission).toBe(4.95);
        expect(calls.rebuilt).toEqual([]);
    });
});

describe('setBenchmarks', () => {
    beforeEach(() => {
        db.current = fakeDb({ Portfolios: [portfolio()] });
    });

    it('checks every symbol before the write, so none can silently produce no series', async () => {
        await setBenchmarks(USER_ID, 0, ['SPY', 'QQQ']);
        expect(calls.assets).toEqual(['SPY', 'QQQ']);
        expect(setOf().benchmarks).toEqual(['SPY', 'QQQ']);
    });

    it('de-duplicates', async () => {
        await expect(setBenchmarks(USER_ID, 0, ['SPY', 'SPY'])).resolves.toEqual(['SPY']);
    });

    it('refuses a symbol the market data does not know, and writes nothing', async () => {
        state.unknownSymbols = new Set(['NOPE']);
        await expect(setBenchmarks(USER_ID, 0, ['NOPE'])).rejects.toMatchObject({ code: 'ASSET_NOT_FOUND' });
        expect(db.current.of('Portfolios').writes.some((w) => w.method === 'updateOne')).toBe(false);
    });

    it('refuses more than the configured maximum, before it looks any of them up', async () => {
        const many = Array.from({ length: config.limits.benchmarksPerPortfolio + 1 }, (_u, i) => `S${i}`);
        await expect(setBenchmarks(USER_ID, 0, many)).rejects.toMatchObject({ code: 'BENCHMARK_LIMIT_REACHED' });
        expect(calls.assets).toEqual([]);
    });

    it('accepts an empty list, which clears them', async () => {
        await expect(setBenchmarks(USER_ID, 0, [])).resolves.toEqual([]);
    });
});

describe('writeSettings', () => {
    beforeEach(() => {
        db.current = fakeDb({ Portfolios: [portfolio()] });
    });

    it('writes only the settings it was given', async () => {
        await writeSettings(USER_ID, 0, { leverage: 2 });
        expect(Object.keys(setOf()).sort()).toEqual(['leverage', 'updatedAt']);
    });

    it('does not replay the log — the log it has to hold up is arriving in the same request', async () => {
        await writeSettings(USER_ID, 0, { leverage: 4 });
        expect(calls.validated).toEqual([]);
        expect(calls.rebuilt).toEqual([]);
    });

    it('touches nothing at all when given no settings', async () => {
        await writeSettings(USER_ID, 0, {});
        expect(db.current.of('Portfolios').writes).toEqual([]);
    });

    it('de-duplicates and checks benchmarks it is given', async () => {
        await writeSettings(USER_ID, 0, { benchmarks: ['SPY', 'SPY', 'QQQ'] });
        expect(setOf().benchmarks).toEqual(['SPY', 'QQQ']);
        expect(calls.assets).toEqual(['SPY', 'QQQ']);
    });
});

describe('applyDeclaredState', () => {
    it('overwrites the derived fields with what the owner declared', async () => {
        db.current = fakeDb({ Portfolios: [portfolio()] });
        const stats = { totalReturn: 0.42 } as never;
        await applyDeclaredState(USER_ID, 0, { stats });
        expect(setOf().stats).toBe(stats);
    });

    it('writes nothing when the import declared nothing', async () => {
        db.current = fakeDb({ Portfolios: [portfolio()] });
        await applyDeclaredState(USER_ID, 0, {});
        expect(db.current.of('Portfolios').writes).toEqual([]);
    });

    it('does not open the slot — it runs after a rebuild, which already did', async () => {
        db.current = fakeDb({ Portfolios: [portfolio()] });
        await applyDeclaredState(USER_ID, 0, { valueHistory: [] });
        expect(db.current.of('Portfolios').writes.every((w) => w.method === 'updateOne')).toBe(true);
    });
});

describe('deletePortfolio', () => {
    it('deletes the slot and everything derived from it', async () => {
        db.current = fakeDb({ Portfolios: [portfolio()] });
        await deletePortfolio(USER_ID, 0);

        expect(db.current.of('Portfolios').writes[0]?.args[0]).toEqual({ userId: USER_ID, number: 0 });
        expect(db.current.of('Positions').writes[0]?.args[0]).toEqual({ userId: USER_ID, portfolioNumber: 0 });
        expect(db.current.of('Trades').writes[0]?.args[0]).toEqual({ userId: USER_ID, portfolioNumber: 0 });
    });

    it('refuses a slot that was never used, and deletes nothing', async () => {
        db.current = fakeDb({ Portfolios: [] });
        db.current.of('Portfolios').results.deleteOne = { acknowledged: true, deletedCount: 0 };

        await expect(deletePortfolio(USER_ID, 3)).rejects.toMatchObject({ code: 'PORTFOLIO_NOT_FOUND' });
        expect(db.current.of('Trades').writes).toEqual([]);
    });
});
