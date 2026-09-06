import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId, type WithId } from 'mongodb';
import type { ScreenerDoc } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const cache: { invalidated: string[] } = { invalidated: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/cache.js', () => ({
    invalidatePrefix: (prefix: string) => {
        cache.invalidated.push(prefix);
        return Promise.resolve();
    },
}));

const {
    createScreener,
    deleteScreener,
    getScreener,
    invalidateResults,
    listScreeners,
    renameScreener,
    setScreenerIncluded,
    toSummary,
} = await import('@/services/screener/screener-crud.js');
const { config } = await import('@/lib/config.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');
const SCREENER_ID = new ObjectId('507f191e810c19729de860ea');

function screener(overrides: Partial<ScreenerDoc> = {}): WithId<ScreenerDoc> {
    return {
        _id: SCREENER_ID,
        userId: USER_ID,
        name: 'Growth',
        nameLower: 'growth',
        include: true,
        filters: { PE: [1, 20] },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        ...overrides,
    } as WithId<ScreenerDoc>;
}

/** A driver duplicate-key error, which is what the unique index actually raises. */
const duplicateKey = (): Error => Object.assign(new Error('E11000 duplicate key'), { code: 11000 });

beforeEach(() => {
    db.current = fakeDb();
    cache.invalidated = [];
});

describe('toSummary', () => {
    it('reports the filter count rather than the filters themselves', () => {
        expect(toSummary(screener())).toEqual({
            id: SCREENER_ID.toHexString(),
            name: 'Growth',
            include: true,
            filterCount: 1,
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        });
    });

    it('counts nothing for a screener with no filters', () => {
        expect(toSummary(screener({ filters: {} })).filterCount).toBe(0);
    });
});

describe('listScreeners', () => {
    it("lists one user's screeners as summaries", async () => {
        db.current = fakeDb({ Screeners: [screener()] });
        const rows = await listScreeners(USER_ID);
        expect(db.current.of('Screeners').filters[0]).toEqual({ userId: USER_ID });
        expect(rows[0]).not.toHaveProperty('filters');
    });

    it('returns nothing for a user with none', async () => {
        db.current = fakeDb({ Screeners: [] });
        await expect(listScreeners(USER_ID)).resolves.toEqual([]);
    });
});

describe('getScreener', () => {
    it('matches the name case-insensitively', async () => {
        db.current = fakeDb({ Screeners: [screener()] });
        await getScreener(USER_ID, 'GROWTH');
        expect(db.current.of('Screeners').filters[0]).toEqual({ userId: USER_ID, nameLower: 'growth' });
    });

    it('refuses a screener that does not exist', async () => {
        db.current = fakeDb({ Screeners: [] });
        db.current.of('Screeners').results.findOne = null;
        await expect(getScreener(USER_ID, 'Growth')).rejects.toMatchObject({
            code: 'SCREENER_NOT_FOUND',
            status: 404,
        });
    });
});

describe('createScreener', () => {
    beforeEach(() => {
        db.current = fakeDb({ Screeners: [] });
    });

    it('stores the display name and the lower-cased one it is matched by', async () => {
        await createScreener(USER_ID, 'GrOwTh');
        const document = db.current.of('Screeners').writes[0]?.args[0] as ScreenerDoc;
        expect(document.name).toBe('GrOwTh');
        expect(document.nameLower).toBe('growth');
    });

    it('starts included, with no filters', async () => {
        await createScreener(USER_ID, 'Growth');
        const document = db.current.of('Screeners').writes[0]?.args[0] as ScreenerDoc;
        expect(document.include).toBe(true);
        expect(document.filters).toEqual({});
    });

    it('refuses once the user is at the screener limit', async () => {
        db.current = fakeDb({ Screeners: [] });
        db.current.of('Screeners').results.countDocuments = config.limits.screenersPerUser;

        await expect(createScreener(USER_ID, 'Growth')).rejects.toMatchObject({
            code: 'SCREENER_LIMIT_REACHED',
            params: { max: config.limits.screenersPerUser },
        });
        expect(db.current.of('Screeners').writes).toEqual([]);
    });

    it("turns the unique index's duplicate-key error into a name-taken code", async () => {
        db.current.of('Screeners').insertOne.mockRejectedValueOnce(duplicateKey());
        await expect(createScreener(USER_ID, 'Growth')).rejects.toMatchObject({
            code: 'SCREENER_NAME_TAKEN',
            status: 409,
        });
    });

    it('lets any other write failure through unchanged', async () => {
        db.current.of('Screeners').insertOne.mockRejectedValueOnce(new Error('not primary'));
        await expect(createScreener(USER_ID, 'Growth')).rejects.toThrow('not primary');
    });
});

describe('renameScreener', () => {
    beforeEach(() => {
        db.current = fakeDb({ Screeners: [screener()] });
        db.current.of('Screeners').results.findOneAndUpdate = screener({ name: 'Value', nameLower: 'value' });
    });

    it('writes both the display and the match name, and drops the cached results', async () => {
        await renameScreener(USER_ID, 'Growth', 'Value');
        const update = db.current.of('Screeners').writes[0]?.args[1] as { $set: Record<string, unknown> };

        expect(update.$set).toMatchObject({ name: 'Value', nameLower: 'value' });
        expect(cache.invalidated).toEqual([`u:${USER_ID.toHexString()}:screener:`]);
    });

    it('returns the renamed summary', async () => {
        await expect(renameScreener(USER_ID, 'Growth', 'Value')).resolves.toMatchObject({ name: 'Value' });
    });

    it('refuses a screener that does not exist', async () => {
        db.current.of('Screeners').results.findOneAndUpdate = null;
        await expect(renameScreener(USER_ID, 'Nope', 'Value')).rejects.toMatchObject({
            code: 'SCREENER_NOT_FOUND',
        });
    });

    it('turns a duplicate key into a name-taken code naming the new name', async () => {
        db.current.of('Screeners').findOneAndUpdate.mockRejectedValueOnce(duplicateKey());
        await expect(renameScreener(USER_ID, 'Growth', 'Value')).rejects.toMatchObject({
            code: 'SCREENER_NAME_TAKEN',
        });
    });

    it('lets any other failure through', async () => {
        db.current.of('Screeners').findOneAndUpdate.mockRejectedValueOnce(new Error('not primary'));
        await expect(renameScreener(USER_ID, 'Growth', 'Value')).rejects.toThrow('not primary');
    });
});

describe('deleteScreener', () => {
    it('deletes by the lower-cased name and drops the cached results', async () => {
        db.current = fakeDb({ Screeners: [screener()] });
        await deleteScreener(USER_ID, 'GROWTH');

        expect(db.current.of('Screeners').writes[0]?.args[0]).toEqual({ userId: USER_ID, nameLower: 'growth' });
        expect(cache.invalidated).toHaveLength(1);
    });

    it('refuses a screener that does not exist, and drops nothing', async () => {
        db.current = fakeDb({ Screeners: [] });
        db.current.of('Screeners').results.deleteOne = { acknowledged: true, deletedCount: 0 };

        await expect(deleteScreener(USER_ID, 'Nope')).rejects.toMatchObject({ code: 'SCREENER_NOT_FOUND' });
        expect(cache.invalidated).toEqual([]);
    });
});

describe('setScreenerIncluded', () => {
    beforeEach(() => {
        db.current = fakeDb({ Screeners: [screener()] });
        db.current.of('Screeners').results.findOneAndUpdate = screener({ include: false });
    });

    it.each([true, false])('writes the membership flag as %s', async (include) => {
        db.current.of('Screeners').results.findOneAndUpdate = screener({ include });
        await expect(setScreenerIncluded(USER_ID, 'Growth', { include })).resolves.toMatchObject({ include });

        const update = db.current.of('Screeners').writes[0]?.args[1] as { $set: { include: boolean } };
        expect(update.$set.include).toBe(include);
    });

    it('drops the cached results — membership changes the combined set', async () => {
        await setScreenerIncluded(USER_ID, 'Growth', { include: false });
        expect(cache.invalidated).toHaveLength(1);
    });

    it('refuses a screener that does not exist', async () => {
        db.current.of('Screeners').results.findOneAndUpdate = null;
        await expect(setScreenerIncluded(USER_ID, 'Nope', { include: true })).rejects.toMatchObject({
            code: 'SCREENER_NOT_FOUND',
        });
    });
});

describe('invalidateResults', () => {
    it('drops every cached set for one user and nobody else', async () => {
        await invalidateResults(USER_ID);
        expect(cache.invalidated).toEqual([`u:${USER_ID.toHexString()}:screener:`]);
    });
});
