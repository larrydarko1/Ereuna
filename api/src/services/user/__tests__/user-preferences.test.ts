import { ObjectId, type WithId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserDoc } from '@ereuna/shared';

import { userDoc } from '@/__tests__/support/fixtures.js';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import { recordAt } from '@/__tests__/support/values.js';

const db: { current: DbStub } = { current: fakeDb() };
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const cache: { invalidated: string[] } = { invalidated: [] };
vi.mock('@/services/screener/screener-crud.js', () => ({
    invalidateResults: (userId: { toHexString: () => string }) => {
        cache.invalidated.push(userId.toHexString());
        return Promise.resolve();
    },
}));

const { getPreferences, hideSymbol, unhideSymbol, updatePreferences } =
    await import('@/services/user/user-preferences.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

function user(overrides: Partial<UserDoc> = {}): WithId<UserDoc> {
    return userDoc({ _id: USER_ID, ...overrides });
}

const setOf = (): Record<string, unknown> => recordAt(db.current.of('Users').writes[0]?.args, 1, '$set');

beforeEach(() => {
    db.current = fakeDb({ Users: [user()] });
    cache.invalidated = [];
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
        const projection = recordAt(db.current.of('Users').findOne.mock.calls, 0, 1, 'projection');
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
        // Arrives as JSON would: a known field beside one the type does not have
        const patch = { language: 'fr', passwordHash: 'nope' };
        await updatePreferences(USER_ID, patch);
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

    // The column selection is part of the screener's projection, so a page
    // cached before the change is missing the column just asked for.
    it('drops the cached result pages when the column selection changes', async () => {
        await updatePreferences(USER_ID, { screenerColumns: ['PERatio'] });
        expect(cache.invalidated).toEqual([USER_ID.toHexString()]);
    });

    it('leaves them alone for a preference the screener does not read', async () => {
        await updatePreferences(USER_ID, { theme: 'dark' });
        expect(cache.invalidated).toEqual([]);
    });
});

describe('hideSymbol', () => {
    it('adds to the set, so hiding twice does not duplicate', async () => {
        await hideSymbol(USER_ID, 'AAPL');
        expect(db.current.of('Users').writes[0]?.args[1]).toMatchObject({ $addToSet: { hiddenSymbols: 'AAPL' } });
    });

    it('returns the hidden set', async () => {
        db.current = fakeDb({ Users: [user({ hiddenSymbols: ['AAPL'] })] });
        await expect(hideSymbol(USER_ID, 'AAPL')).resolves.toEqual(['AAPL']);
    });

    /**
     * The hidden list is an input to every screener query, and those pages are
     * cached under a key that does not mention it. Without this the symbol goes
     * on appearing in results until the entry expires — the button looked dead.
     */
    it('drops the cached result pages, which were built before the symbol moved', async () => {
        await hideSymbol(USER_ID, 'AAPL');
        expect(cache.invalidated).toEqual([USER_ID.toHexString()]);
    });
});

describe('unhideSymbol', () => {
    it('pulls the symbol, which is a no-op when it is not there', async () => {
        await unhideSymbol(USER_ID, 'AAPL');
        expect(db.current.of('Users').writes[0]?.args[1]).toMatchObject({ $pull: { hiddenSymbols: 'AAPL' } });
    });

    it('returns the hidden set', async () => {
        await expect(unhideSymbol(USER_ID, 'AAPL')).resolves.toEqual([]);
    });

    it('drops the cached result pages too, so the symbol comes back', async () => {
        await unhideSymbol(USER_ID, 'AAPL');
        expect(cache.invalidated).toEqual([USER_ID.toHexString()]);
    });
});
