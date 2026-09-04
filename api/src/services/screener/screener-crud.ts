/** screener-crud — create, rename, delete, list, and toggle a saved screener. */
import { ObjectId, type WithId } from 'mongodb';
import type { ScreenerDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { invalidatePrefix } from '@/lib/cache.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';

export type ScreenerSummary = {
    id: string;
    name: string;
    include: boolean;
    filterCount: number;
    updatedAt: Date;
};

export function toSummary(doc: WithId<ScreenerDoc>): ScreenerSummary {
    return {
        id: doc._id.toHexString(),
        name: doc.name,
        include: doc.include,
        filterCount: Object.keys(doc.filters).length,
        updatedAt: doc.updatedAt,
    };
}

export async function listScreeners(userId: ObjectId): Promise<ScreenerSummary[]> {
    const docs = await getDb().collection<ScreenerDoc>('Screeners').find({ userId }).sort({ nameLower: 1 }).toArray();
    return docs.map(toSummary);
}

export async function getScreener(userId: ObjectId, name: string): Promise<WithId<ScreenerDoc>> {
    const doc = await getDb().collection<ScreenerDoc>('Screeners').findOne({ userId, nameLower: name.toLowerCase() });

    if (doc === null) throw new AppError(404, 'SCREENER_NOT_FOUND', `screener ${name} not found`);
    return doc;
}

export async function createScreener(userId: ObjectId, name: string): Promise<ScreenerSummary> {
    const screeners = getDb().collection<ScreenerDoc>('Screeners');

    const count = await screeners.countDocuments({ userId });
    if (count >= config.limits.screenersPerUser) {
        throw new AppError(422, 'SCREENER_LIMIT_REACHED', `user is at the screener limit`, {
            params: { max: config.limits.screenersPerUser },
        });
    }

    const now = new Date();
    const doc: ScreenerDoc = {
        userId,
        name,
        nameLower: name.toLowerCase(),
        include: true,
        filters: {},
        createdAt: now,
        updatedAt: now,
    };

    // The unique index on (userId, nameLower) is what actually enforces this;
    // catching its error is how a concurrent create gets a meaningful code
    // rather than a duplicate-key stack trace.
    try {
        const result = await screeners.insertOne(doc);
        return toSummary({ ...doc, _id: result.insertedId });
    } catch (err) {
        if (isDuplicateKey(err)) {
            throw new AppError(409, 'SCREENER_NAME_TAKEN', `screener ${name} already exists`);
        }
        throw err;
    }
}

export async function renameScreener(userId: ObjectId, name: string, newName: string): Promise<ScreenerSummary> {
    const screeners = getDb().collection<ScreenerDoc>('Screeners');

    try {
        const updated = await screeners.findOneAndUpdate(
            { userId, nameLower: name.toLowerCase() },
            { $set: { name: newName, nameLower: newName.toLowerCase(), updatedAt: new Date() } },
            { returnDocument: 'after' },
        );
        if (updated === null) throw new AppError(404, 'SCREENER_NOT_FOUND', `screener ${name} not found`);

        await invalidateResults(userId);
        return toSummary(updated);
    } catch (err) {
        if (isDuplicateKey(err)) {
            throw new AppError(409, 'SCREENER_NAME_TAKEN', `screener ${newName} already exists`);
        }
        throw err;
    }
}

export async function deleteScreener(userId: ObjectId, name: string): Promise<void> {
    const result = await getDb()
        .collection<ScreenerDoc>('Screeners')
        .deleteOne({ userId, nameLower: name.toLowerCase() });

    if (result.deletedCount === 0) throw new AppError(404, 'SCREENER_NOT_FOUND', `screener ${name} not found`);
    await invalidateResults(userId);
}

/** Switch a screener in or out of the combined results set. */
export async function setScreenerIncluded(userId: ObjectId, name: string, include: boolean): Promise<ScreenerSummary> {
    const updated = await getDb()
        .collection<ScreenerDoc>('Screeners')
        .findOneAndUpdate(
            { userId, nameLower: name.toLowerCase() },
            { $set: { include, updatedAt: new Date() } },
            { returnDocument: 'after' },
        );

    if (updated === null) throw new AppError(404, 'SCREENER_NOT_FOUND', `screener ${name} not found`);

    await invalidateResults(userId);
    return toSummary(updated);
}

/** Drop every cached result set for a user — any filter or membership change invalidates them all. */
export async function invalidateResults(userId: ObjectId): Promise<void> {
    await invalidatePrefix(`u:${userId.toHexString()}:screener:`);
}

function isDuplicateKey(err: unknown): boolean {
    return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 11000;
}
