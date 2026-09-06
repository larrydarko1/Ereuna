import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId, type WithId } from 'mongodb';
import type { UserDoc } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const { getPreferences, hideSymbol, unhideSymbol, updatePreferences } =
    await import('@/services/user/user-preferences.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

function user(overrides: Partial<UserDoc> = {}): WithId<UserDoc> {
    return {
        _id: USER_ID,
        language: 'en',
        theme: null,
        defaultSymbol: 'AAPL',
        hiddenSymbols: [],
        chartSettings: null,
        panels: null,
        screenerColumns: [],
        ...overrides,
    } as WithId<UserDoc>;
}

const setOf = (): Record<string, unknown> =>
    (db.current.of('Users').writes[0]?.args[1] as { $set: Record<string, unknown> }).$set;

beforeEach(() => {
    db.current = fakeDb({ Users: [user()] });
});

describe('getPreferences', () => {
    it('returns exactly the seven interface fields and nothing else', async () => {
        await expect(getPreferences(USER_ID)).resolves.toEqual({
            language: 'en',
            theme: null,
            defaultSymbol: 'AAPL',
            hiddenSymbols: [],
            chartSettings: null,
            panels: null,
            screenerColumns: [],
        });
    });

    it('projects rather than reading the whole document, so no credential is loaded', async () => {
        await getPreferences(USER_ID);
        const [, options] = db.current.of('Users').findOne.mock.calls[0] ?? [];
        const projection = (options as { projection: Record<string, number> }).projection;
        expect(Object.keys(projection).sort()).toEqual([
            'chartSettings',
            'defaultSymbol',
            'hiddenSymbols',
            'language',
            'panels',
            'screenerColumns',
            'theme',
        ]);
    });

    it('refuses a user that does not exist', async () => {
        db.current.of('Users').results.findOne = null;
        await expect(getPreferences(USER_ID)).rejects.toMatchObject({ code: 'USER_NOT_FOUND', status: 404 });
    });
});

describe('updatePreferences', () => {
    it('writes only the fields the patch names', async () => {
        await updatePreferences(USER_ID, { language: 'fr' });
        expect(Object.keys(setOf()).sort()).toEqual(['language', 'updatedAt']);
    });

    it('writes a null, which is a real value for theme and chart settings', async () => {
        await updatePreferences(USER_ID, { theme: null });
        expect(setOf()).toHaveProperty('theme', null);
    });

    it('ignores a field the patch left undefined', async () => {
        await updatePreferences(USER_ID, { language: 'fr', theme: undefined });
        expect(setOf()).not.toHaveProperty('theme');
    });

    it('ignores a key that is not a preference at all', async () => {
        await updatePreferences(USER_ID, { passwordHash: 'nope' } as never);
        expect(setOf()).not.toHaveProperty('passwordHash');
    });

    it('reads the preferences back, so the caller gets the whole set', async () => {
        await expect(updatePreferences(USER_ID, { language: 'fr' })).resolves.toHaveProperty('language', 'en');
    });

    it('refuses when no user matched', async () => {
        db.current.of('Users').results.updateOne = { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
        await expect(updatePreferences(USER_ID, { language: 'fr' })).rejects.toMatchObject({
            code: 'USER_NOT_FOUND',
        });
    });
});

describe('hideSymbol', () => {
    it('adds to the set, so hiding twice does not duplicate', async () => {
        await hideSymbol(USER_ID, 'AAPL');
        const update = db.current.of('Users').writes[0]?.args[1] as { $addToSet: { hiddenSymbols: string } };
        expect(update.$addToSet.hiddenSymbols).toBe('AAPL');
    });

    it('returns the hidden set', async () => {
        db.current = fakeDb({ Users: [user({ hiddenSymbols: ['AAPL'] })] });
        await expect(hideSymbol(USER_ID, 'AAPL')).resolves.toEqual(['AAPL']);
    });
});

describe('unhideSymbol', () => {
    it('pulls the symbol, which is a no-op when it is not there', async () => {
        await unhideSymbol(USER_ID, 'AAPL');
        const update = db.current.of('Users').writes[0]?.args[1] as { $pull: { hiddenSymbols: string } };
        expect(update.$pull.hiddenSymbols).toBe('AAPL');
    });

    it('returns the hidden set', async () => {
        await expect(unhideSymbol(USER_ID, 'AAPL')).resolves.toEqual([]);
    });
});
