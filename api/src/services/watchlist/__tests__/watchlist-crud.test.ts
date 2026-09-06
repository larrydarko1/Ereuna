import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId, type WithId } from 'mongodb';
import type { WatchlistDoc } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const { createWatchlist, deleteWatchlist, getWatchlist, listWatchlists, renameWatchlist, reorderWatchlists } =
    await import('@/services/watchlist/watchlist-crud.js');
const { config } = await import('@/lib/config.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

function watchlist(overrides: Partial<WatchlistDoc> = {}): WithId<WatchlistDoc> {
    return {
        _id: new ObjectId(),
        userId: USER_ID,
        name: 'Tech',
        nameLower: 'tech',
        list: [{ ticker: 'AAPL', exchange: 'NASDAQ' }],
        position: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        ...overrides,
    } as WithId<WatchlistDoc>;
}

const duplicateKey = (): Error => Object.assign(new Error('E11000 duplicate key'), { code: 11000 });

const bulkOrder = (): { id: ObjectId; position: number }[] =>
    (
        (db.current.of('Watchlists').writes.find((w) => w.method === 'bulkWrite')?.args[0] ?? []) as {
            updateOne: { filter: { _id: ObjectId }; update: { $set: { position: number } } };
        }[]
    ).map((op) => ({ id: op.updateOne.filter._id, position: op.updateOne.update.$set.position }));

beforeEach(() => {
    db.current = fakeDb();
});

describe('listWatchlists', () => {
    it('summarises each list with its ticker count rather than its tickers', async () => {
        db.current = fakeDb({ Watchlists: [watchlist()] });
        const rows = await listWatchlists(USER_ID);
        expect(rows[0]).toMatchObject({ name: 'Tech', position: 0, tickerCount: 1 });
        expect(rows[0]).not.toHaveProperty('list');
    });

    it('scopes the read to the user', async () => {
        db.current = fakeDb({ Watchlists: [] });
        await listWatchlists(USER_ID);
        expect(db.current.of('Watchlists').filters[0]).toEqual({ userId: USER_ID });
    });
});

describe('getWatchlist', () => {
    it('matches the name case-insensitively', async () => {
        db.current = fakeDb({ Watchlists: [watchlist()] });
        await getWatchlist(USER_ID, 'TECH');
        expect(db.current.of('Watchlists').filters[0]).toEqual({ userId: USER_ID, nameLower: 'tech' });
    });

    it('refuses one that does not exist', async () => {
        db.current = fakeDb({ Watchlists: [] });
        db.current.of('Watchlists').results.findOne = null;
        await expect(getWatchlist(USER_ID, 'Nope')).rejects.toMatchObject({
            code: 'WATCHLIST_NOT_FOUND',
            status: 404,
        });
    });
});

describe('createWatchlist', () => {
    beforeEach(() => {
        db.current = fakeDb({ Watchlists: [] });
    });

    it('appends at the end of the existing order', async () => {
        db.current.of('Watchlists').results.countDocuments = 3;
        await createWatchlist(USER_ID, 'Tech');
        const document = db.current.of('Watchlists').writes[0]?.args[0] as WatchlistDoc;
        expect(document.position).toBe(3);
    });

    it('starts empty, with both name forms stored', async () => {
        await createWatchlist(USER_ID, 'TeCh');
        const document = db.current.of('Watchlists').writes[0]?.args[0] as WatchlistDoc;
        expect(document).toMatchObject({ name: 'TeCh', nameLower: 'tech', list: [] });
    });

    it('refuses once the user is at the limit', async () => {
        db.current.of('Watchlists').results.countDocuments = config.limits.watchlistsPerUser;
        await expect(createWatchlist(USER_ID, 'Tech')).rejects.toMatchObject({
            code: 'WATCHLIST_LIMIT_REACHED',
        });
        expect(db.current.of('Watchlists').writes).toEqual([]);
    });

    it('turns a duplicate key into a name-taken code', async () => {
        db.current.of('Watchlists').insertOne.mockRejectedValueOnce(duplicateKey());
        await expect(createWatchlist(USER_ID, 'Tech')).rejects.toMatchObject({
            code: 'WATCHLIST_NAME_TAKEN',
            status: 409,
        });
    });

    it('lets any other write failure through', async () => {
        db.current.of('Watchlists').insertOne.mockRejectedValueOnce(new Error('not primary'));
        await expect(createWatchlist(USER_ID, 'Tech')).rejects.toThrow('not primary');
    });
});

describe('renameWatchlist', () => {
    beforeEach(() => {
        db.current = fakeDb({ Watchlists: [watchlist()] });
        db.current.of('Watchlists').results.findOneAndUpdate = watchlist({ name: 'Energy', nameLower: 'energy' });
    });

    it('writes both name forms', async () => {
        await expect(renameWatchlist(USER_ID, 'Tech', 'Energy')).resolves.toMatchObject({ name: 'Energy' });
        const update = db.current.of('Watchlists').writes[0]?.args[1] as { $set: Record<string, unknown> };
        expect(update.$set).toMatchObject({ name: 'Energy', nameLower: 'energy' });
    });

    it('refuses one that does not exist', async () => {
        db.current.of('Watchlists').results.findOneAndUpdate = null;
        await expect(renameWatchlist(USER_ID, 'Nope', 'Energy')).rejects.toMatchObject({
            code: 'WATCHLIST_NOT_FOUND',
        });
    });

    it('turns a duplicate key into a name-taken code', async () => {
        db.current.of('Watchlists').findOneAndUpdate.mockRejectedValueOnce(duplicateKey());
        await expect(renameWatchlist(USER_ID, 'Tech', 'Energy')).rejects.toMatchObject({
            code: 'WATCHLIST_NAME_TAKEN',
        });
    });

    it('lets any other failure through', async () => {
        db.current.of('Watchlists').findOneAndUpdate.mockRejectedValueOnce(new Error('not primary'));
        await expect(renameWatchlist(USER_ID, 'Tech', 'Energy')).rejects.toThrow('not primary');
    });
});

describe('deleteWatchlist', () => {
    it('closes the gap it leaves, so positions stay a dense range', async () => {
        const remaining = [watchlist({ position: 1 }), watchlist({ position: 3 })];
        db.current = fakeDb({ Watchlists: remaining });

        await deleteWatchlist(USER_ID, 'Tech');
        expect(bulkOrder().map((row) => row.position)).toEqual([0, 1]);
    });

    it('refuses one that does not exist, and reorders nothing', async () => {
        db.current = fakeDb({ Watchlists: [] });
        db.current.of('Watchlists').results.deleteOne = { acknowledged: true, deletedCount: 0 };

        await expect(deleteWatchlist(USER_ID, 'Nope')).rejects.toMatchObject({ code: 'WATCHLIST_NOT_FOUND' });
        expect(db.current.of('Watchlists').writes.some((w) => w.method === 'bulkWrite')).toBe(false);
    });

    it('writes no order when the user has none left', async () => {
        db.current = fakeDb({ Watchlists: [] });
        await deleteWatchlist(USER_ID, 'Tech');
        expect(db.current.of('Watchlists').writes.map((w) => w.method)).toEqual(['deleteOne']);
    });
});

describe('reorderWatchlists', () => {
    const tech = watchlist({ name: 'Tech', nameLower: 'tech', position: 0 });
    const energy = watchlist({ name: 'Energy', nameLower: 'energy', position: 1 });
    const health = watchlist({ name: 'Health', nameLower: 'health', position: 2 });

    it('applies the requested order', async () => {
        db.current = fakeDb({ Watchlists: [tech, energy, health] });
        await reorderWatchlists(USER_ID, ['Health', 'Tech', 'Energy']);

        expect(bulkOrder()).toEqual([
            { id: health._id, position: 0 },
            { id: tech._id, position: 1 },
            { id: energy._id, position: 2 },
        ]);
    });

    it('keeps the ones the caller omitted, in their existing order, at the end', async () => {
        db.current = fakeDb({ Watchlists: [tech, energy, health] });
        await reorderWatchlists(USER_ID, ['Health']);

        expect(bulkOrder().map((row) => row.id)).toEqual([health._id, tech._id, energy._id]);
    });

    it('matches names case-insensitively', async () => {
        db.current = fakeDb({ Watchlists: [tech, energy] });
        await expect(reorderWatchlists(USER_ID, ['ENERGY', 'tech'])).resolves.toBeDefined();
    });

    it('refuses a name the user does not have, and writes nothing', async () => {
        db.current = fakeDb({ Watchlists: [tech] });
        await expect(reorderWatchlists(USER_ID, ['Nope'])).rejects.toMatchObject({
            code: 'WATCHLIST_NOT_FOUND',
        });
        expect(db.current.of('Watchlists').writes).toEqual([]);
    });

    it('scopes every position write to the owner as well as the id', async () => {
        db.current = fakeDb({ Watchlists: [tech] });
        await reorderWatchlists(USER_ID, ['Tech']);
        const operations = db.current.of('Watchlists').writes[0]?.args[0] as {
            updateOne: { filter: { userId: ObjectId } };
        }[];
        expect(operations[0]?.updateOne.filter.userId).toBe(USER_ID);
    });
});
