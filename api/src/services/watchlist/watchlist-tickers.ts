/** watchlist-tickers — the symbols inside one watchlist, and their quotes. */
import type { Collection, ObjectId } from 'mongodb';
import type { WatchlistDoc, WatchlistEntry } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { assetExchange } from '@/services/market/index.js';
import { quotes, type Quote } from '@/services/market/market-quotes.js';
import { getWatchlist } from '@/services/watchlist/watchlist-crud.js';

export type WatchlistRow = WatchlistEntry & {
    quote: Quote | null;
};

/**
 * The watchlist with a quote attached to each entry.
 * Entries whose symbol has no bar yet come back with `quote: null` rather than
 * being dropped — a symbol the ingestor has not reached should still be visible
 * in the list the user built.
 */
export async function getWatchlistRows(userId: ObjectId, name: string): Promise<{ name: string; rows: WatchlistRow[] }> {
    const watchlist = await getWatchlist(userId, name);
    const bySymbol = new Map((await quotes(watchlist.list.map((entry) => entry.ticker))).map((q) => [q.symbol, q]));

    return {
        name: watchlist.name,
        rows: watchlist.list.map((entry) => ({ ...entry, quote: bySymbol.get(entry.ticker) ?? null })),
    };
}

export async function addTicker(userId: ObjectId, name: string, symbol: string): Promise<WatchlistEntry[]> {
    const watchlist = await getWatchlist(userId, name);

    if (watchlist.list.some((entry) => entry.ticker === symbol)) {
        throw new AppError(409, 'WATCHLIST_TICKER_EXISTS', `${symbol} is already in ${name}`, { params: { symbol } });
    }
    if (watchlist.list.length >= config.limits.tickersPerWatchlist) {
        throw new AppError(422, 'WATCHLIST_FULL', `watchlist ${name} is at the ticker limit`, {
            params: { max: config.limits.tickersPerWatchlist },
        });
    }

    // Resolve the exchange from reference data rather than trusting the client,
    // and throw ASSET_NOT_FOUND when the symbol is not one the ingestor carries.
    const entry: WatchlistEntry = { ticker: symbol, exchange: await assetExchange(symbol) };

    const updated = await collection().findOneAndUpdate(
        { _id: watchlist._id, userId },
        { $push: { list: entry }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' },
    );

    return updated?.list ?? [...watchlist.list, entry];
}

export async function removeTicker(userId: ObjectId, name: string, symbol: string): Promise<WatchlistEntry[]> {
    const watchlist = await getWatchlist(userId, name);

    if (!watchlist.list.some((entry) => entry.ticker === symbol)) {
        throw new AppError(404, 'WATCHLIST_TICKER_NOT_FOUND', `${symbol} is not in ${name}`, { params: { symbol } });
    }

    const updated = await collection().findOneAndUpdate(
        { _id: watchlist._id, userId },
        { $pull: { list: { ticker: symbol } }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' },
    );

    return updated?.list ?? [];
}

/**
 * Rewrite the ticker order from a full list of symbols.
 * The incoming order is applied to the entries the watchlist already holds;
 * symbols it does not hold are rejected and symbols the caller omitted keep
 * their relative order at the end. Exchanges are never taken from the request
 * — they come from the stored entry, so a reorder cannot rewrite them.
 */
export async function reorderTickers(userId: ObjectId, name: string, symbols: readonly string[]): Promise<WatchlistEntry[]> {
    const watchlist = await getWatchlist(userId, name);
    const held = new Map(watchlist.list.map((entry) => [entry.ticker, entry]));

    const unknown = symbols.filter((symbol) => !held.has(symbol));
    if (unknown.length > 0) {
        throw new AppError(404, 'WATCHLIST_TICKER_NOT_FOUND', `not in ${name}: ${unknown.join(', ')}`);
    }

    const ordered = [
        ...symbols.flatMap((symbol) => held.get(symbol) ?? []),
        ...watchlist.list.filter((entry) => !symbols.includes(entry.ticker)),
    ];

    await collection().updateOne({ _id: watchlist._id, userId }, { $set: { list: ordered, updatedAt: new Date() } });
    return ordered;
}

function collection(): Collection<WatchlistDoc> {
    return getDb().collection<WatchlistDoc>('Watchlists');
}
