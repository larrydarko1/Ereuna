/**
 * note-crud — a user's research notes on a symbol.
 * Notes are per user and per symbol, and nothing else reads them, so this is a
 * plain owned-document CRUD: every query carries `userId`, which is what makes
 * one user's notes unreachable from another's session regardless of the id in
 * the path.
 */
import type { Collection, ObjectId, WithId } from 'mongodb';
import type { NoteDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { getAsset } from '@/services/market/index.js';

export type NoteRow = {
    id: string;
    symbol: string;
    message: string;
    createdAt: Date;
    updatedAt: Date;
};

export type NotePage = {
    items: NoteRow[];
    total: number;
    page: number;
    limit: number;
};

/**
 * Notes, newest first, optionally narrowed to one symbol.
 * The unfiltered listing is the "everything I have written" view; the filtered
 * one is what the chart panel asks for. They are one query because the only
 * difference is a field in the filter.
 */
export async function getNotePage(
    userId: ObjectId,
    options: { page: number; limit: number; symbol?: string },
): Promise<NotePage> {
    const { page, limit, symbol } = options;
    const filter = { userId, ...(symbol !== undefined ? { symbol } : {}) };

    const [items, total] = await Promise.all([
        collection()
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
        collection().countDocuments(filter),
    ]);

    return { items: items.map(toRow), total, page, limit };
}

export async function createNote(userId: ObjectId, symbol: string, message: string): Promise<NoteRow> {
    await getAsset(symbol);

    const count = await collection().countDocuments({ userId, symbol });
    if (count >= config.limits.notesPerSymbol) {
        throw new AppError(422, 'NOTE_LIMIT_REACHED', `note limit reached for ${symbol}`, {
            params: { symbol, max: config.limits.notesPerSymbol },
        });
    }

    const now = new Date();
    const doc: NoteDoc = { userId, symbol, message, createdAt: now, updatedAt: now };
    const result = await collection().insertOne(doc);

    return toRow({ _id: result.insertedId, ...doc });
}

export async function updateNote(userId: ObjectId, noteId: ObjectId, message: string): Promise<NoteRow> {
    const doc = await collection().findOneAndUpdate(
        { _id: noteId, userId },
        { $set: { message, updatedAt: new Date() } },
        { returnDocument: 'after' },
    );

    if (doc === null) throw new AppError(404, 'NOTE_NOT_FOUND', `note ${noteId.toHexString()} not found`);
    return toRow(doc);
}

export async function deleteNote(userId: ObjectId, noteId: ObjectId): Promise<void> {
    const result = await collection().deleteOne({ _id: noteId, userId });
    if (result.deletedCount === 0) {
        throw new AppError(404, 'NOTE_NOT_FOUND', `note ${noteId.toHexString()} not found`);
    }
}

function toRow(doc: WithId<NoteDoc>): NoteRow {
    return {
        id: doc._id.toHexString(),
        symbol: doc.symbol,
        message: doc.message,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

function collection(): Collection<NoteDoc> {
    return getDb().collection<NoteDoc>('Notes');
}
