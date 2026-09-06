import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId, type WithId } from 'mongodb';
import type { WatchlistDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const state: { watchlist: WithId<WatchlistDoc> | null; exchange: string | Error; quotes: unknown[] } = {
    watchlist: null,
    exchange: 'NASDAQ',
    quotes: [],
};

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/services/market/index.js', () => ({
    assetExchange: () =>
        state.exchange instanceof Error ? Promise.reject(state.exchange) : Promise.resolve(state.exchange),
}));
vi.mock('@/services/market/market-quotes.js', () => ({ quotes: () => Promise.resolve(state.quotes) }));
vi.mock('@/services/watchlist/watchlist-crud.js', () => ({
    getWatchlist: () => {
        if (state.watchlist === null) {
            return Promise.reject(new AppError(404, 'WATCHLIST_NOT_FOUND', 'not found'));
        }
        return Promise.resolve(state.watchlist);
    },
}));

const { addTicker, getWatchlistRows, removeTicker, reorderTickers } =
    await import('@/services/watchlist/watchlist-tickers.js');
const { config } = await import('@/lib/config.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');
const LIST_ID = new ObjectId('507f191e810c19729de860ea');

function watchlist(list: { ticker: string; exchange: string }[]): WithId<WatchlistDoc> {
    return {
        _id: LIST_ID,
        userId: USER_ID,
        name: 'Tech',
        nameLower: 'tech',
        list,
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as WithId<WatchlistDoc>;
}

beforeEach(() => {
    db.current = fakeDb({ Watchlists: [] });
    state.watchlist = watchlist([{ ticker: 'AAPL', exchange: 'NASDAQ' }]);
    state.exchange = 'NASDAQ';
    state.quotes = [];
});

describe('getWatchlistRows', () => {
    it("attaches each entry's quote", async () => {
        state.quotes = [{ symbol: 'AAPL', price: 100 }];
        const result = await getWatchlistRows(USER_ID, 'Tech');
        expect(result.name).toBe('Tech');
        expect(result.rows[0]).toEqual({ ticker: 'AAPL', exchange: 'NASDAQ', quote: { symbol: 'AAPL', price: 100 } });
    });

    it('keeps an entry the ingestor has no bar for, with a null quote', async () => {
        const result = await getWatchlistRows(USER_ID, 'Tech');
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]?.quote).toBeNull();
    });

    it('answers an empty list with no rows', async () => {
        state.watchlist = watchlist([]);
        await expect(getWatchlistRows(USER_ID, 'Tech').then((r) => r.rows)).resolves.toEqual([]);
    });
});

describe('addTicker', () => {
    it('resolves the exchange from reference data rather than trusting the client', async () => {
        state.watchlist = watchlist([]);
        state.exchange = 'NYSE';
        await addTicker(USER_ID, 'Tech', 'IBM');

        const update = db.current.of('Watchlists').writes[0]?.args[1] as { $push: { list: unknown } };
        expect(update.$push.list).toEqual({ ticker: 'IBM', exchange: 'NYSE' });
    });

    it('scopes the write to the owner as well as the list id', async () => {
        state.watchlist = watchlist([]);
        await addTicker(USER_ID, 'Tech', 'IBM');
        expect(db.current.of('Watchlists').writes[0]?.args[0]).toEqual({ _id: LIST_ID, userId: USER_ID });
    });

    it('refuses a symbol already in the list', async () => {
        await expect(addTicker(USER_ID, 'Tech', 'AAPL')).rejects.toMatchObject({
            code: 'WATCHLIST_TICKER_EXISTS',
            status: 409,
            params: { symbol: 'AAPL' },
        });
        expect(db.current.of('Watchlists').writes).toEqual([]);
    });

    it('refuses once the list is full', async () => {
        state.watchlist = watchlist(
            Array.from({ length: config.limits.tickersPerWatchlist }, (_u, i) => ({
                ticker: `S${i}`,
                exchange: 'NASDAQ',
            })),
        );
        await expect(addTicker(USER_ID, 'Tech', 'IBM')).rejects.toMatchObject({ code: 'WATCHLIST_FULL' });
    });

    it('refuses a symbol the ingestor does not carry, before it writes anything', async () => {
        state.watchlist = watchlist([]);
        state.exchange = new AppError(404, 'ASSET_NOT_FOUND', 'nope');
        await expect(addTicker(USER_ID, 'Tech', 'NOPE')).rejects.toMatchObject({ code: 'ASSET_NOT_FOUND' });
        expect(db.current.of('Watchlists').writes).toEqual([]);
    });

    it('falls back to the list it built when the driver returns no document', async () => {
        state.watchlist = watchlist([]);
        db.current.of('Watchlists').results.findOneAndUpdate = null;
        await expect(addTicker(USER_ID, 'Tech', 'IBM')).resolves.toEqual([{ ticker: 'IBM', exchange: 'NASDAQ' }]);
    });
});

describe('removeTicker', () => {
    it('pulls the entry by symbol', async () => {
        await removeTicker(USER_ID, 'Tech', 'AAPL');
        const update = db.current.of('Watchlists').writes[0]?.args[1] as { $pull: { list: unknown } };
        expect(update.$pull.list).toEqual({ ticker: 'AAPL' });
    });

    it('refuses a symbol that is not in the list', async () => {
        await expect(removeTicker(USER_ID, 'Tech', 'IBM')).rejects.toMatchObject({
            code: 'WATCHLIST_TICKER_NOT_FOUND',
            params: { symbol: 'IBM' },
        });
        expect(db.current.of('Watchlists').writes).toEqual([]);
    });

    it('reports an empty list when the driver returns no document', async () => {
        db.current.of('Watchlists').results.findOneAndUpdate = null;
        await expect(removeTicker(USER_ID, 'Tech', 'AAPL')).resolves.toEqual([]);
    });
});

describe('reorderTickers', () => {
    beforeEach(() => {
        state.watchlist = watchlist([
            { ticker: 'AAPL', exchange: 'NASDAQ' },
            { ticker: 'MSFT', exchange: 'NASDAQ' },
            { ticker: 'IBM', exchange: 'NYSE' },
        ]);
    });

    it('applies the requested order', async () => {
        await expect(reorderTickers(USER_ID, 'Tech', ['IBM', 'AAPL', 'MSFT'])).resolves.toEqual([
            { ticker: 'IBM', exchange: 'NYSE' },
            { ticker: 'AAPL', exchange: 'NASDAQ' },
            { ticker: 'MSFT', exchange: 'NASDAQ' },
        ]);
    });

    it('keeps the omitted symbols, in their existing order, at the end', async () => {
        const ordered = await reorderTickers(USER_ID, 'Tech', ['IBM']);
        expect(ordered.map((entry) => entry.ticker)).toEqual(['IBM', 'AAPL', 'MSFT']);
    });

    it('takes each exchange from the stored entry, so a reorder cannot rewrite one', async () => {
        const ordered = await reorderTickers(USER_ID, 'Tech', ['IBM', 'AAPL', 'MSFT']);
        expect(ordered[0]?.exchange).toBe('NYSE');
    });

    it('refuses a symbol the list does not hold, and writes nothing', async () => {
        await expect(reorderTickers(USER_ID, 'Tech', ['TSLA'])).rejects.toMatchObject({
            code: 'WATCHLIST_TICKER_NOT_FOUND',
        });
        expect(db.current.of('Watchlists').writes).toEqual([]);
    });

    it('scopes the write to the owner', async () => {
        await reorderTickers(USER_ID, 'Tech', ['IBM']);
        expect(db.current.of('Watchlists').writes[0]?.args[0]).toEqual({ _id: LIST_ID, userId: USER_ID });
    });
});
