/** watchlist-crud — create, rename, delete, list and reorder a user's watchlists. */
import type { Collection, ObjectId, WithId } from 'mongodb';
import type { WatchlistDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';

export type WatchlistSummary = {
    id: string;
    name: string;
    position: number;
    tickerCount: number;
    updatedAt: Date;
};

export async function listWatchlists(userId: ObjectId): Promise<WatchlistSummary[]> {
    const docs = await collection().find({ userId }).sort({ position: 1 }).toArray();
    return docs.map(toSummary);
}

export async function getWatchlist(userId: ObjectId, name: string): Promise<WithId<WatchlistDoc>> {
    const doc = await collection().findOne({ userId, nameLower: name.toLowerCase() });
    if (doc === null) throw new AppError(404, 'WATCHLIST_NOT_FOUND', `watchlist ${name} not found`);
    return doc;
}

export async function createWatchlist(userId: ObjectId, name: string): Promise<WatchlistSummary> {
    const watchlists = collection();

    const count = await watchlists.countDocuments({ userId });
    if (count >= config.limits.watchlistsPerUser) {
        throw new AppError(422, 'WATCHLIST_LIMIT_REACHED', 'user is at the watchlist limit', {
            params: { max: config.limits.watchlistsPerUser },
        });
    }

    const now = new Date();
    const doc: WatchlistDoc = {
        userId,
        name,
        nameLower: name.toLowerCase(),
        list: [],
        position: count,
        createdAt: now,
        updatedAt: now,
    };

    try {
        const result = await watchlists.insertOne(doc);
        return toSummary({ ...doc, _id: result.insertedId });
    } catch (err) {
        if (isDuplicateKey(err)) throw new AppError(409, 'WATCHLIST_NAME_TAKEN', `watchlist ${name} already exists`);
        throw err;
    }
}

export async function renameWatchlist(userId: ObjectId, name: string, newName: string): Promise<WatchlistSummary> {
    try {
        const updated = await collection().findOneAndUpdate(
            { userId, nameLower: name.toLowerCase() },
            { $set: { name: newName, nameLower: newName.toLowerCase(), updatedAt: new Date() } },
            { returnDocument: 'after' },
        );
        if (updated === null) throw new AppError(404, 'WATCHLIST_NOT_FOUND', `watchlist ${name} not found`);

        return toSummary(updated);
    } catch (err) {
        if (isDuplicateKey(err)) throw new AppError(409, 'WATCHLIST_NAME_TAKEN', `watchlist ${newName} already exists`);
        throw err;
    }
}

export async function deleteWatchlist(userId: ObjectId, name: string): Promise<void> {
    const result = await collection().deleteOne({ userId, nameLower: name.toLowerCase() });
    if (result.deletedCount === 0) throw new AppError(404, 'WATCHLIST_NOT_FOUND', `watchlist ${name} not found`);

    await compactOrder(userId);
}

export async function reorderWatchlists(userId: ObjectId, names: readonly string[]): Promise<WatchlistSummary[]> {
    const docs = await collection().find({ userId }).sort({ position: 1 }).toArray();

    const wanted = names.map((name) => name.toLowerCase());
    const missing = wanted.filter((name) => !docs.some((doc) => doc.nameLower === name));
    if (missing.length > 0) {
        throw new AppError(404, 'WATCHLIST_NOT_FOUND', `unknown watchlists: ${missing.join(', ')}`);
    }

    const ordered = [
        ...wanted.flatMap((name) => docs.filter((doc) => doc.nameLower === name)),
        ...docs.filter((doc) => !wanted.includes(doc.nameLower)),
    ];

    await writeOrder(userId, ordered);
    return listWatchlists(userId);
}

function toSummary(doc: WithId<WatchlistDoc>): WatchlistSummary {
    return {
        id: doc._id.toHexString(),
        name: doc.name,
        position: doc.position,
        tickerCount: doc.list.length,
        updatedAt: doc.updatedAt,
    };
}

/** Close the gap a delete leaves, so `position` stays a dense 0..n-1 range. */
async function compactOrder(userId: ObjectId): Promise<void> {
    const docs = await collection().find({ userId }).sort({ position: 1 }).toArray();
    await writeOrder(userId, docs);
}

async function writeOrder(userId: ObjectId, ordered: readonly WithId<WatchlistDoc>[]): Promise<void> {
    if (ordered.length === 0) return;

    const now = new Date();
    await collection().bulkWrite(
        ordered.map((doc, position) => ({
            updateOne: { filter: { _id: doc._id, userId }, update: { $set: { position, updatedAt: now } } },
        })),
    );
}

function collection(): Collection<WatchlistDoc> {
    return getDb().collection<WatchlistDoc>('Watchlists');
}

function isDuplicateKey(err: unknown): boolean {
    return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 11000;
}
