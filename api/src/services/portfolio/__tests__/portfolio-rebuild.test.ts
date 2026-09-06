import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId, type WithId } from 'mongodb';
import type { TradeDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const market: { schedules: Map<string, unknown>; asked: string[][] } = { schedules: new Map(), asked: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/services/market/index.js', () => ({
    getAsset: (symbol: string) => Promise.resolve({ Symbol: symbol }),
    dividendSchedules: (symbols: string[]) => {
        market.asked.push([...symbols]);
        return Promise.resolve(market.schedules);
    },
}));

const { readTrades, rebuild, validateLog } = await import('@/services/portfolio/portfolio-rebuild.js');
const { config } = await import('@/lib/config.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

let sequence = 0;

function trade(overrides: Partial<TradeDoc> = {}): WithId<TradeDoc> {
    sequence += 1;
    return {
        _id: new ObjectId(),
        userId: USER_ID,
        portfolioNumber: 0,
        symbol: 'AAPL',
        action: 'buy',
        shares: 10,
        price: 100,
        total: 1_000,
        commission: 0,
        tradeDate: new Date('2026-01-05T00:00:00.000Z'),
        createdAt: new Date(1_700_000_000_000 + sequence),
        ...overrides,
    } as WithId<TradeDoc>;
}

const deposit = (amount: number): WithId<TradeDoc> =>
    trade({
        symbol: null,
        action: 'deposit',
        shares: 0,
        price: 0,
        total: amount,
        tradeDate: new Date('2026-01-01T00:00:00.000Z'),
    });

beforeEach(() => {
    db.current = fakeDb();
    market.schedules = new Map();
    market.asked = [];
    sequence = 0;
});

describe('readTrades', () => {
    it('reads one portfolio in replay order', async () => {
        db.current = fakeDb({ Trades: [] });
        await readTrades(USER_ID, 0);
        expect(db.current.of('Trades').filters[0]).toEqual({ userId: USER_ID, portfolioNumber: 0 });
    });

    it('returns the documents whole, so a write path can identify one by id', async () => {
        const one = trade();
        db.current = fakeDb({ Trades: [one] });
        await expect(readTrades(USER_ID, 0)).resolves.toEqual([one]);
    });
});

describe('validateLog', () => {
    it('accepts a log that funds its own purchases', async () => {
        await expect(validateLog([deposit(10_000), trade()], 1)).resolves.toBeUndefined();
    });

    it('refuses a buy the log cannot fund, naming the shortfall and the date', async () => {
        await expect(validateLog([trade()], 1)).rejects.toThrow(AppError);
        try {
            await validateLog([trade()], 1);
        } catch (err) {
            const failure = err as AppError;
            expect(failure.code).toBe('INSUFFICIENT_BUYING_POWER');
            expect(failure.status).toBe(422);
            expect(failure.params).toMatchObject({ action: 'buy', symbol: 'AAPL', date: '2026-01-05' });
        }
    });

    it('refuses a sale of shares the log never bought', async () => {
        const sell = trade({ action: 'sell' });
        await expect(validateLog([deposit(10_000), sell], 1)).rejects.toMatchObject({
            code: 'INSUFFICIENT_SHARES',
        });
    });

    it('lets leverage fund a purchase that cash alone could not', async () => {
        const log = [deposit(600), trade()];
        await expect(validateLog(log, 1)).rejects.toThrow();
        await expect(validateLog(log, 2)).resolves.toBeUndefined();
    });

    it('folds dividends in as cash, so a buy the user could afford is not refused', async () => {
        market.schedules = new Map([['AAPL', [{ paymentDate: new Date('2026-01-10T00:00:00.000Z'), amount: 100 }]]]);
        const log = [
            deposit(1_000),
            trade({ tradeDate: new Date('2026-01-02T00:00:00.000Z') }),
            trade({ tradeDate: new Date('2026-01-20T00:00:00.000Z'), shares: 9, total: 900 }),
        ];
        await expect(validateLog(log, 1)).resolves.toBeUndefined();
    });

    it('asks the schedule only for the symbols the log actually holds', async () => {
        await validateLog([deposit(10_000), trade({ symbol: 'MSFT' })], 1);
        expect(market.asked[0]).toEqual(['MSFT']);
    });

    it('refuses a log that would leave more open positions than the limit', async () => {
        const many = [
            deposit(10_000_000),
            ...Array.from({ length: config.limits.positionsPerPortfolio + 1 }, (_unused, index) =>
                trade({ symbol: `S${index}`, shares: 1, price: 1, total: 1 }),
            ),
        ];
        await expect(validateLog(many, 1)).rejects.toMatchObject({ code: 'POSITION_LIMIT_REACHED' });
    });

    it('accepts an empty log', async () => {
        await expect(validateLog([], 1)).resolves.toBeUndefined();
    });
});

describe('rebuild', () => {
    beforeEach(() => {
        db.current = fakeDb({
            Trades: [deposit(10_000), trade()],
            Portfolios: [{ baseValue: 10_000, leverage: 1 }],
            Positions: [],
        });
    });

    it('writes cash, the value history and the statistics back onto the portfolio', async () => {
        await rebuild(USER_ID, 0);
        const update = db.current.of('Portfolios').writes[0]?.args[1] as { $set: Record<string, unknown> };

        expect(update.$set).toHaveProperty('cash');
        expect(update.$set).toHaveProperty('valueHistory');
        expect(update.$set).toHaveProperty('stats');
        expect(update.$set.updatedAt).toBeInstanceOf(Date);
    });

    it('replaces the whole position set rather than diffing it', async () => {
        await rebuild(USER_ID, 0);
        const writes = db.current.of('Positions').writes;
        expect(writes[0]?.method).toBe('deleteMany');
        expect(writes[0]?.args[0]).toEqual({ userId: USER_ID, portfolioNumber: 0 });
        expect(writes[1]?.method).toBe('insertMany');
    });

    it('inserts nothing when the replay leaves no open position', async () => {
        db.current = fakeDb({ Trades: [deposit(10_000)], Portfolios: [{ baseValue: 0, leverage: 1 }] });
        await rebuild(USER_ID, 0);
        expect(db.current.of('Positions').writes.map((write) => write.method)).toEqual(['deleteMany']);
    });

    it('returns the replayed state alongside the log it came from', async () => {
        const state = await rebuild(USER_ID, 0);
        expect(state.trades).toHaveLength(2);
        expect(state.positions[0]).toMatchObject({ symbol: 'AAPL', side: 'long', shares: 10 });
        expect(state.cash).toBe(9_000);
    });

    it('reads only the two fields the replay depends on', async () => {
        await rebuild(USER_ID, 0);
        expect(db.current.of('Portfolios').findOne).toHaveBeenCalledWith(
            { userId: USER_ID, number: 0 },
            { projection: { baseValue: 1, leverage: 1 } },
        );
    });

    it('rebuilds a slot whose document does not exist yet, at the default leverage', async () => {
        db.current = fakeDb({ Trades: [deposit(1_000)], Portfolios: [] });
        db.current.of('Portfolios').results.findOne = null;
        await expect(rebuild(USER_ID, 0)).resolves.toMatchObject({ cash: 1_000 });
    });

    it('derives dividends on every rebuild rather than writing them into the log', async () => {
        market.schedules = new Map([['AAPL', [{ paymentDate: new Date('2026-02-01T00:00:00.000Z'), amount: 1 }]]]);
        const state = await rebuild(USER_ID, 0);
        expect(state.cash).toBe(9_010);
        expect(db.current.of('Trades').writes).toEqual([]);
    });
});
