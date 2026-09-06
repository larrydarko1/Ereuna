import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId, type WithId } from 'mongodb';
import type { UserDoc } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import { fakeArgon2, hashOf } from '@/__tests__/support/argon2.js';

const db: { current: DbStub } = { current: fakeDb() };
const calls: { revoked: string[]; invalidated: string[] } = { revoked: [], invalidated: [] };

vi.mock('argon2', () => ({ default: fakeArgon2 }));
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/cache.js', () => ({
    invalidatePrefix: (prefix: string) => {
        calls.invalidated.push(prefix);
        return Promise.resolve();
    },
}));
vi.mock('@/services/auth/auth-tokens.js', () => ({
    revokeAllUserTokens: (userId: ObjectId) => {
        calls.revoked.push(userId.toHexString());
        return Promise.resolve();
    },
    toAuthUser: (user: WithId<UserDoc>) => ({ id: user._id.toHexString(), username: user.username }),
}));

const { changePassword, changeUsername, deleteAccount, getAccount, setPasswordAfterRecovery } =
    await import('@/services/user/user-account.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

function user(overrides: Partial<UserDoc> = {}): WithId<UserDoc> {
    return {
        _id: USER_ID,
        username: 'Larry',
        usernameLower: 'larry',
        passwordHash: hashOf('Str0ng!pass'),
        passwordResetRequired: false,
        language: 'en',
        totpEnabled: false,
        ...overrides,
    } as WithId<UserDoc>;
}

const setOf = (): Record<string, unknown> =>
    (db.current.of('Users').writes[0]?.args[1] as { $set: Record<string, unknown> }).$set;

beforeEach(() => {
    db.current = fakeDb({ Users: [user()] });
    calls.revoked = [];
    calls.invalidated = [];
});

describe('getAccount', () => {
    it('projects the user through the same block every auth response carries', async () => {
        await expect(getAccount(USER_ID)).resolves.toEqual({ id: USER_ID.toHexString(), username: 'Larry' });
    });

    it('refuses a user that does not exist', async () => {
        db.current.of('Users').results.findOne = null;
        await expect(getAccount(USER_ID)).rejects.toMatchObject({ code: 'USER_NOT_FOUND', status: 404 });
    });
});

describe('changePassword', () => {
    it('re-authenticates with the current password before writing the new one', async () => {
        await expect(changePassword(USER_ID, 'wrong', 'New!pass1')).rejects.toMatchObject({
            code: 'INCORRECT_PASSWORD',
            status: 401,
        });
        expect(db.current.of('Users').writes).toEqual([]);
    });

    it('stores the new hash and dates the change', async () => {
        await changePassword(USER_ID, 'Str0ng!pass', 'New!pass1');
        expect(setOf().passwordHash).toBe(hashOf('New!pass1'));
        expect(setOf().passwordChangedAt).toBeInstanceOf(Date);
    });

    it('clears the reset flag, so a recovery session is back to normal', async () => {
        db.current = fakeDb({ Users: [user({ passwordResetRequired: true })] });
        await changePassword(USER_ID, 'Str0ng!pass', 'New!pass1');
        expect(setOf().passwordResetRequired).toBe(false);
    });

    it('revokes every session, so a stolen refresh token dies with the old password', async () => {
        await changePassword(USER_ID, 'Str0ng!pass', 'New!pass1');
        expect(calls.revoked).toEqual([USER_ID.toHexString()]);
    });

    it('refuses for a user that does not exist', async () => {
        db.current.of('Users').results.findOne = null;
        await expect(changePassword(USER_ID, 'x', 'y')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
    });
});

describe('setPasswordAfterRecovery', () => {
    it('refuses unless the recovery login raised the flag', async () => {
        await expect(setPasswordAfterRecovery(USER_ID, 'New!pass1')).rejects.toMatchObject({
            code: 'PASSWORD_RESET_NOT_ALLOWED',
            status: 403,
        });
        expect(db.current.of('Users').writes).toEqual([]);
    });

    it('sets the password without the old one when the flag is up, and lowers it', async () => {
        db.current = fakeDb({ Users: [user({ passwordResetRequired: true })] });
        await setPasswordAfterRecovery(USER_ID, 'New!pass1');

        expect(setOf().passwordHash).toBe(hashOf('New!pass1'));
        expect(setOf().passwordResetRequired).toBe(false);
    });

    it('revokes every session', async () => {
        db.current = fakeDb({ Users: [user({ passwordResetRequired: true })] });
        await setPasswordAfterRecovery(USER_ID, 'New!pass1');
        expect(calls.revoked).toEqual([USER_ID.toHexString()]);
    });
});

describe('changeUsername', () => {
    // Two reads: the account itself, then the uniqueness check. The second has
    // to answer null for the name to be free.
    beforeEach(() => {
        db.current = fakeDb({ Users: [user()] });
        db.current.of('Users').findOne.mockResolvedValueOnce(user()).mockResolvedValueOnce(null);
        db.current.of('Users').results.findOneAndUpdate = user({ username: 'Lorenzo', usernameLower: 'lorenzo' });
    });

    it('re-authenticates with the password', async () => {
        await expect(changeUsername(USER_ID, 'wrong', 'Lorenzo')).rejects.toMatchObject({
            code: 'INCORRECT_PASSWORD',
        });
        expect(db.current.of('Users').writes).toEqual([]);
    });

    it('writes both name forms', async () => {
        await changeUsername(USER_ID, 'Str0ng!pass', 'LoReNzO');
        const update = db.current.of('Users').writes[0]?.args[1] as { $set: Record<string, unknown> };
        expect(update.$set).toMatchObject({ username: 'LoReNzO', usernameLower: 'lorenzo' });
    });

    it('refuses a name another account already holds', async () => {
        db.current = fakeDb({ Users: [user()] });
        db.current.of('Users').findOne.mockResolvedValueOnce(user()).mockResolvedValueOnce({ _id: new ObjectId() });

        await expect(changeUsername(USER_ID, 'Str0ng!pass', 'Taken')).rejects.toMatchObject({
            code: 'USERNAME_TAKEN',
            status: 409,
        });
        expect(db.current.of('Users').writes).toEqual([]);
    });

    it("excludes the caller from the uniqueness check, so re-casing one's own name is allowed", async () => {
        await changeUsername(USER_ID, 'Str0ng!pass', 'LARRY');
        expect(db.current.of('Users').findOne).toHaveBeenLastCalledWith(
            { usernameLower: 'larry', _id: { $ne: USER_ID } },
            { projection: { _id: 1 } },
        );
    });

    it('does not revoke sessions — a rename is not a credential change', async () => {
        await changeUsername(USER_ID, 'Str0ng!pass', 'Lorenzo');
        expect(calls.revoked).toEqual([]);
    });

    it('refuses when the update matched nothing', async () => {
        db.current.of('Users').results.findOneAndUpdate = null;
        await expect(changeUsername(USER_ID, 'Str0ng!pass', 'Lorenzo')).rejects.toMatchObject({
            code: 'USER_NOT_FOUND',
        });
    });
});

describe('deleteAccount', () => {
    it('re-authenticates with the password before deleting anything', async () => {
        await expect(deleteAccount(USER_ID, 'wrong')).rejects.toMatchObject({ code: 'INCORRECT_PASSWORD' });
        expect(db.current.of('Users').writes).toEqual([]);
    });

    it('deletes every collection the user owns, then the user', async () => {
        await deleteAccount(USER_ID, 'Str0ng!pass');

        for (const collection of [
            'Screeners',
            'Watchlists',
            'Portfolios',
            'Positions',
            'Trades',
            'Notes',
            'ChartDrawings',
        ]) {
            expect({ collection, filter: db.current.of(collection).writes[0]?.args[0] }).toEqual({
                collection,
                filter: { userId: USER_ID },
            });
        }
        expect(db.current.of('Users').writes[0]?.args[0]).toEqual({ _id: USER_ID });
    });

    it('revokes every session and drops everything cached for the account', async () => {
        await deleteAccount(USER_ID, 'Str0ng!pass');
        expect(calls.revoked).toEqual([USER_ID.toHexString()]);
        expect(calls.invalidated).toEqual([`u:${USER_ID.toHexString()}:`]);
    });
});
