import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId, type WithId } from 'mongodb';
import type { NoteDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const state: { unknownSymbols: Set<string> } = { unknownSymbols: new Set() };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/services/market/index.js', () => ({
    getAsset: (symbol: string) =>
        state.unknownSymbols.has(symbol)
            ? Promise.reject(new AppError(404, 'ASSET_NOT_FOUND', 'nope'))
            : Promise.resolve({ Symbol: symbol }),
}));

const { createNote, deleteNote, getNotePage, updateNote } = await import('@/services/note/note-crud.js');
const { config } = await import('@/lib/config.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');
const NOTE_ID = new ObjectId('507f191e810c19729de860ea');

function note(overrides: Partial<NoteDoc> = {}): WithId<NoteDoc> {
    return {
        _id: NOTE_ID,
        userId: USER_ID,
        symbol: 'AAPL',
        message: 'Watching the gap fill',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        ...overrides,
    } as WithId<NoteDoc>;
}

beforeEach(() => {
    db.current = fakeDb({ Notes: [] });
    state.unknownSymbols = new Set();
});

describe('getNotePage', () => {
    it('reads everything the user has written when no symbol is named', async () => {
        await getNotePage(USER_ID, { page: 1, limit: 10 });
        expect(db.current.of('Notes').filters[0]).toEqual({ userId: USER_ID });
    });

    it('narrows to one symbol for the chart panel', async () => {
        await getNotePage(USER_ID, { page: 1, limit: 10, symbol: 'AAPL' });
        expect(db.current.of('Notes').filters[0]).toEqual({ userId: USER_ID, symbol: 'AAPL' });
    });

    it('renders rows rather than documents, and reports the page it served', async () => {
        db.current = fakeDb({ Notes: [note()] });
        const page = await getNotePage(USER_ID, { page: 2, limit: 5 });

        expect(page).toMatchObject({ total: 1, page: 2, limit: 5 });
        expect(page.items[0]).toEqual({
            id: NOTE_ID.toHexString(),
            symbol: 'AAPL',
            message: 'Watching the gap fill',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        });
    });
});

describe('createNote', () => {
    it('checks the symbol exists before it counts or writes anything', async () => {
        state.unknownSymbols = new Set(['NOPE']);
        await expect(createNote(USER_ID, 'NOPE', 'hi')).rejects.toMatchObject({ code: 'ASSET_NOT_FOUND' });
        expect(db.current.of('Notes').writes).toEqual([]);
    });

    it('stores the note against the user and the symbol', async () => {
        await createNote(USER_ID, 'AAPL', 'Watching the gap fill');
        const document = db.current.of('Notes').writes[0]?.args[0] as NoteDoc;
        expect(document).toMatchObject({ userId: USER_ID, symbol: 'AAPL', message: 'Watching the gap fill' });
    });

    it('counts per symbol, not per account', async () => {
        await createNote(USER_ID, 'AAPL', 'hi');
        expect(db.current.of('Notes').countDocuments).toHaveBeenCalledWith({ userId: USER_ID, symbol: 'AAPL' });
    });

    it('refuses once the symbol is at its note limit', async () => {
        db.current.of('Notes').results.countDocuments = config.limits.notesPerSymbol;
        await expect(createNote(USER_ID, 'AAPL', 'hi')).rejects.toMatchObject({
            code: 'NOTE_LIMIT_REACHED',
            params: { symbol: 'AAPL', max: config.limits.notesPerSymbol },
        });
    });

    it('returns the row the client can render immediately', async () => {
        await expect(createNote(USER_ID, 'AAPL', 'hi')).resolves.toMatchObject({ symbol: 'AAPL', message: 'hi' });
    });
});

describe('updateNote', () => {
    it('scopes the update to the owner, so an id from another session matches nothing', async () => {
        db.current = fakeDb({ Notes: [note()] });
        await updateNote(USER_ID, NOTE_ID, 'edited');
        expect(db.current.of('Notes').writes[0]?.args[0]).toEqual({ _id: NOTE_ID, userId: USER_ID });
    });

    it('writes the new message and touches the timestamp', async () => {
        db.current = fakeDb({ Notes: [note()] });
        await updateNote(USER_ID, NOTE_ID, 'edited');
        const update = db.current.of('Notes').writes[0]?.args[1] as { $set: Record<string, unknown> };
        expect(update.$set.message).toBe('edited');
        expect(update.$set.updatedAt).toBeInstanceOf(Date);
    });

    it("refuses a note that is not the caller's", async () => {
        db.current.of('Notes').results.findOneAndUpdate = null;
        await expect(updateNote(USER_ID, NOTE_ID, 'edited')).rejects.toMatchObject({
            code: 'NOTE_NOT_FOUND',
            status: 404,
        });
    });
});

describe('deleteNote', () => {
    it('scopes the delete to the owner', async () => {
        await deleteNote(USER_ID, NOTE_ID);
        expect(db.current.of('Notes').writes[0]?.args[0]).toEqual({ _id: NOTE_ID, userId: USER_ID });
    });

    it("refuses a note that is not the caller's", async () => {
        db.current.of('Notes').results.deleteOne = { acknowledged: true, deletedCount: 0 };
        await expect(deleteNote(USER_ID, NOTE_ID)).rejects.toMatchObject({ code: 'NOTE_NOT_FOUND' });
    });
});
