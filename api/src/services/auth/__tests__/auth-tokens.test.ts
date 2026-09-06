import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { ObjectId, type WithId } from 'mongodb';
import type { UserDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import { fakeArgon2, hashOf } from '@/__tests__/support/argon2.js';

const db: { current: DbStub } = { current: fakeDb() };
const throttle: { locked: boolean; recorded: string[]; cleared: string[] } = {
    locked: false,
    recorded: [],
    cleared: [],
};

vi.mock('argon2', () => ({ default: fakeArgon2 }));
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));
vi.mock('@/services/auth/login-throttle.js', () => ({
    throttleKey: (username: string) => `key:${username.toLowerCase()}`,
    assertLoginAllowed: (key: string) => {
        if (throttle.locked) return Promise.reject(new AppError(429, 'RATE_LIMITED', 'locked'));
        return Promise.resolve(void key);
    },
    recordLoginFailure: (key: string) => {
        throttle.recorded.push(key);
        return Promise.resolve(throttle.recorded.length);
    },
    clearLoginFailures: (key: string) => {
        throttle.cleared.push(key);
        return Promise.resolve();
    },
}));

const {
    issueSession,
    loginUser,
    registerUser,
    revokeAllUserTokens,
    revokeRefreshToken,
    rotateRefreshToken,
    toAuthUser,
    verify2FATempToken,
} = await import('@/services/auth/auth-tokens.js');
const { config } = await import('@/lib/config.js');
const { sha256 } = await import('@/lib/crypto.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

function user(overrides: Partial<UserDoc> = {}): WithId<UserDoc> {
    return {
        _id: USER_ID,
        username: 'Larry',
        usernameLower: 'larry',
        passwordHash: hashOf('Str0ng!pass'),
        totpSecretEncrypted: null,
        pendingTotpSecretEncrypted: null,
        totpEnabled: false,
        recoveryCodeHashes: [],
        passwordResetRequired: false,
        language: 'en',
        theme: null,
        defaultSymbol: 'AAPL',
        hiddenSymbols: [],
        chartSettings: null,
        panels: null,
        screenerColumns: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        passwordChangedAt: null,
        ...overrides,
    } as WithId<UserDoc>;
}

const decode = (token: string): Record<string, unknown> =>
    jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as Record<string, unknown>;

/** The document the refresh-token insert wrote. */
const inserted = (index = 0): Record<string, unknown> =>
    db.current.of('RefreshTokens').writes.filter((w) => w.method === 'insertOne')[index]?.args[0] as Record<
        string,
        unknown
    >;

beforeEach(() => {
    db.current = fakeDb();
    throttle.locked = false;
    throttle.recorded = [];
    throttle.cleared = [];
});

describe('toAuthUser', () => {
    it('projects only the fields an auth response carries — never the hash or the secret', () => {
        expect(toAuthUser(user())).toEqual({
            id: USER_ID.toHexString(),
            username: 'Larry',
            language: 'en',
            twoFactorEnabled: false,
            passwordResetRequired: false,
        });
    });
});

describe('registerUser', () => {
    beforeEach(() => {
        db.current = fakeDb({ Users: [] });
        db.current.of('Users').results.findOne = null;
        db.current.of('Users').results.insertOne = { acknowledged: true, insertedId: USER_ID };
    });

    it('refuses a username already taken', async () => {
        db.current.of('Users').results.findOne = { _id: USER_ID };
        await expect(registerUser('Larry', 'Str0ng!pass')).rejects.toThrow(AppError);
    });

    it('matches an existing username case-insensitively', async () => {
        db.current.of('Users').results.findOne = { _id: USER_ID };
        await expect(registerUser('LARRY', 'Str0ng!pass')).rejects.toThrow('already registered');
        expect(db.current.of('Users').filters[0]).toEqual({ usernameLower: 'larry' });
    });

    it('stores the hash and never the password', async () => {
        await registerUser('Larry', 'Str0ng!pass');
        const document = db.current.of('Users').writes[0]?.args[0] as Record<string, unknown>;
        expect(document.passwordHash).toBe(hashOf('Str0ng!pass'));
        expect(JSON.stringify(document)).not.toContain('"Str0ng!pass"');
    });

    it('keeps the display case while indexing the lower-cased name', async () => {
        await registerUser('LaRrY', 'Str0ng!pass');
        const document = db.current.of('Users').writes[0]?.args[0] as Record<string, unknown>;
        expect(document.username).toBe('LaRrY');
        expect(document.usernameLower).toBe('larry');
    });

    it('starts the account with two-factor off and no codes', async () => {
        await registerUser('Larry', 'Str0ng!pass');
        const document = db.current.of('Users').writes[0]?.args[0] as Record<string, unknown>;
        expect(document).toMatchObject({
            totpEnabled: false,
            totpSecretEncrypted: null,
            pendingTotpSecretEncrypted: null,
            recoveryCodeHashes: [],
            passwordResetRequired: false,
        });
    });

    it('returns an access token carrying the new id and nothing else', async () => {
        const result = await registerUser('Larry', 'Str0ng!pass');
        const payload = decode(result.accessToken);
        expect(payload.sub).toBe(USER_ID.toHexString());
        expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
    });

    it('opens a remembered session, so a new account survives a browser restart', async () => {
        const result = await registerUser('Larry', 'Str0ng!pass');
        expect(inserted().rememberMe).toBe(true);
        expect(result.refreshMaxAge).toBeGreaterThan(0);
    });

    it('stores only the hash of the refresh token', async () => {
        const result = await registerUser('Larry', 'Str0ng!pass');
        expect(inserted().tokenHash).toBe(sha256(result.refreshToken));
        expect(inserted().tokenHash).not.toBe(result.refreshToken);
    });
});

describe('loginUser', () => {
    it('signs a user in with the right password', async () => {
        db.current = fakeDb({ Users: [user()] });
        const result = await loginUser('larry', 'Str0ng!pass', { rememberMe: false });
        expect(result.requires2FA).toBe(false);
    });

    it('clears the failure counter on success', async () => {
        db.current = fakeDb({ Users: [user()] });
        await loginUser('larry', 'Str0ng!pass', { rememberMe: false });
        expect(throttle.cleared).toEqual(['key:larry']);
    });

    it('refuses when the account is locked, before it looks anything up', async () => {
        throttle.locked = true;
        db.current = fakeDb({ Users: [user()] });
        await expect(loginUser('larry', 'Str0ng!pass', { rememberMe: false })).rejects.toThrow(AppError);
        expect(db.current.of('Users').filters).toEqual([]);
    });

    it.each([
        ['an unknown username', null, 'Str0ng!pass'],
        ['a wrong password', user(), 'wrong-password'],
    ])('answers %s with the same code, so the two are indistinguishable', async (_label, found, password) => {
        db.current = fakeDb({ Users: [] });
        db.current.of('Users').results.findOne = found;

        await expect(loginUser('larry', password, { rememberMe: false })).rejects.toMatchObject({
            code: 'INVALID_CREDENTIALS',
            status: 401,
        });
    });

    it('verifies a hash even for an unknown username, so the miss cannot be timed', async () => {
        const verify = vi.spyOn(fakeArgon2, 'verify');
        db.current = fakeDb({ Users: [] });
        db.current.of('Users').results.findOne = null;

        await expect(loginUser('nobody', 'anything', { rememberMe: false })).rejects.toThrow();
        expect(verify).toHaveBeenCalledOnce();
        verify.mockRestore();
    });

    it('counts a failure against the account', async () => {
        db.current = fakeDb({ Users: [user()] });
        await expect(loginUser('larry', 'wrong', { rememberMe: false })).rejects.toThrow();
        expect(throttle.recorded).toEqual(['key:larry']);
    });

    it('normalises the submitted username before looking it up', async () => {
        db.current = fakeDb({ Users: [user()] });
        await loginUser('  LARRY  ', 'Str0ng!pass', { rememberMe: false });
        expect(db.current.of('Users').filters[0]).toEqual({ usernameLower: 'larry' });
    });

    it('stops at a temp token when two-factor is on, issuing no session', async () => {
        db.current = fakeDb({ Users: [user({ totpEnabled: true })] });
        const result = await loginUser('larry', 'Str0ng!pass', { rememberMe: true });

        expect(result.requires2FA).toBe(true);
        if (!result.requires2FA) throw new Error('unreachable');
        expect(decode(result.tempToken)).toMatchObject({ sub: USER_ID.toHexString(), type: '2fa_pending' });
        expect(db.current.of('RefreshTokens').writes).toEqual([]);
    });

    it('records the sign-in time', async () => {
        db.current = fakeDb({ Users: [user()] });
        await loginUser('larry', 'Str0ng!pass', { rememberMe: false });
        const update = db.current.of('Users').writes[0]?.args[1] as { $set: { lastLoginAt: Date } };
        expect(update.$set.lastLoginAt).toBeInstanceOf(Date);
    });
});

describe('issueSession', () => {
    beforeEach(() => {
        db.current = fakeDb({ Users: [user()] });
    });

    it('gives a remembered session a cookie lifetime and a longer expiry', async () => {
        const result = await issueSession(user(), { rememberMe: true });
        expect(result.refreshMaxAge).toBeGreaterThan(0);
        expect(inserted().rememberMe).toBe(true);
    });

    it('gives a session-only login no cookie lifetime, so it dies with the browser', async () => {
        const result = await issueSession(user(), { rememberMe: false });
        expect(result.refreshMaxAge).toBeUndefined();
        expect(inserted().rememberMe).toBe(false);
    });

    it('expires a session-only token sooner than a remembered one', async () => {
        await issueSession(user(), { rememberMe: false });
        const shortLived = inserted().expiresAt as Date;
        db.current = fakeDb({ Users: [user()] });
        await issueSession(user(), { rememberMe: true });
        const longLived = inserted().expiresAt as Date;

        expect(shortLived.getTime()).toBeLessThan(longLived.getTime());
    });

    it('opens a new token family per login', async () => {
        await issueSession(user(), { rememberMe: true });
        const first = inserted().familyId;
        db.current = fakeDb({ Users: [user()] });
        await issueSession(user(), { rememberMe: true });
        expect(inserted().familyId).not.toBe(first);
    });

    it('returns the same user block every auth response carries', async () => {
        const result = await issueSession(user(), { rememberMe: true });
        expect(result.user).toEqual(toAuthUser(user()));
    });
});

describe('rotateRefreshToken', () => {
    const future = (): Date => new Date(Date.now() + 60_000);

    it('claims the token atomically and mints a new pair', async () => {
        db.current = fakeDb({ RefreshTokens: [] });
        db.current.of('RefreshTokens').results.findOneAndUpdate = {
            userId: USER_ID,
            familyId: 'fam-1',
            rememberMe: true,
            expiresAt: future(),
        };

        const result = await rotateRefreshToken('raw-token');
        expect(decode(result.accessToken).sub).toBe(USER_ID.toHexString());
        expect(result.refreshToken).not.toBe('raw-token');

        const [filter, update] = db.current.of('RefreshTokens').writes[0]?.args ?? [];
        expect(filter).toEqual({ tokenHash: sha256('raw-token'), usedAt: { $exists: false } });
        expect(update).toMatchObject({ $set: { usedAt: expect.any(Date) } });
    });

    it('carries the family and the original expiry forward, so a session cannot become immortal', async () => {
        const expiresAt = future();
        db.current = fakeDb({ RefreshTokens: [] });
        db.current.of('RefreshTokens').results.findOneAndUpdate = {
            userId: USER_ID,
            familyId: 'fam-1',
            rememberMe: true,
            expiresAt,
        };

        await rotateRefreshToken('raw-token');
        expect(inserted()).toMatchObject({ familyId: 'fam-1', rememberMe: true, expiresAt });
    });

    it('revokes the whole family when a spent token is replayed', async () => {
        db.current = fakeDb({ RefreshTokens: [] });
        db.current.of('RefreshTokens').results.findOneAndUpdate = null;
        db.current.of('RefreshTokens').results.findOne = { userId: USER_ID, familyId: 'fam-1' };

        await expect(rotateRefreshToken('raw-token')).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
        const deletion = db.current.of('RefreshTokens').writes.find((w) => w.method === 'deleteMany');
        expect(deletion?.args[0]).toEqual({ familyId: 'fam-1' });
    });

    it('refuses a token it has never seen, without revoking anything', async () => {
        db.current = fakeDb({ RefreshTokens: [] });
        db.current.of('RefreshTokens').results.findOneAndUpdate = null;
        db.current.of('RefreshTokens').results.findOne = null;

        await expect(rotateRefreshToken('raw-token')).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
        expect(db.current.of('RefreshTokens').writes.some((w) => w.method === 'deleteMany')).toBe(false);
    });

    it('revokes the family when the session ceiling has passed', async () => {
        db.current = fakeDb({ RefreshTokens: [] });
        db.current.of('RefreshTokens').results.findOneAndUpdate = {
            userId: USER_ID,
            familyId: 'fam-1',
            rememberMe: true,
            expiresAt: new Date(Date.now() - 1),
        };

        await expect(rotateRefreshToken('raw-token')).rejects.toMatchObject({ code: 'REFRESH_TOKEN_EXPIRED' });
        expect(db.current.of('RefreshTokens').writes.some((w) => w.method === 'deleteMany')).toBe(true);
    });

    it('gives a session-only rotation no cookie lifetime', async () => {
        db.current = fakeDb({ RefreshTokens: [] });
        db.current.of('RefreshTokens').results.findOneAndUpdate = {
            userId: USER_ID,
            familyId: 'fam-1',
            rememberMe: false,
            expiresAt: future(),
        };
        await expect(rotateRefreshToken('raw-token').then((r) => r.refreshMaxAge)).resolves.toBeUndefined();
    });
});

describe('revoking', () => {
    it('drops the whole family a token belongs to', async () => {
        db.current = fakeDb({ RefreshTokens: [] });
        db.current.of('RefreshTokens').results.findOne = { familyId: 'fam-1' };

        await revokeRefreshToken('raw-token');
        expect(db.current.of('RefreshTokens').writes[0]?.args[0]).toEqual({ familyId: 'fam-1' });
    });

    it('does nothing for a token it does not recognise', async () => {
        db.current = fakeDb({ RefreshTokens: [] });
        db.current.of('RefreshTokens').results.findOne = null;

        await revokeRefreshToken('raw-token');
        expect(db.current.of('RefreshTokens').writes).toEqual([]);
    });

    it('drops every session for a user', async () => {
        db.current = fakeDb({ RefreshTokens: [] });
        await revokeAllUserTokens(USER_ID);
        expect(db.current.of('RefreshTokens').writes[0]?.args[0]).toEqual({ userId: USER_ID });
    });
});

describe('verify2FATempToken', () => {
    it('returns the subject of a valid challenge token', () => {
        const token = jwt.sign({ sub: USER_ID.toHexString(), type: '2fa_pending' }, config.jwt.secret);
        expect(verify2FATempToken(token)).toBe(USER_ID.toHexString());
    });

    it('refuses an access token presented as a challenge token', () => {
        const token = jwt.sign({ sub: USER_ID.toHexString() }, config.jwt.secret);
        expect(() => verify2FATempToken(token)).toThrow(AppError);
        try {
            verify2FATempToken(token);
        } catch (err) {
            expect((err as AppError).code).toBe('INVALID_TOKEN_TYPE');
        }
    });

    it.each([
        [
            'a token signed with another secret',
            jwt.sign({ sub: 'x', type: '2fa_pending' }, 'another-secret-long-enough'),
        ],
        ['a token that is not a JWT', 'not.a.token'],
    ])('refuses %s', (_label, token) => {
        try {
            verify2FATempToken(token);
            throw new Error('should have thrown');
        } catch (err) {
            expect((err as AppError).code).toBe('TWO_FA_TOKEN_INVALID');
        }
    });

    it('refuses an expired challenge token', () => {
        const token = jwt.sign({ sub: 'x', type: '2fa_pending' }, config.jwt.secret, { expiresIn: '-1s' });
        expect(() => verify2FATempToken(token)).toThrow(AppError);
    });
});
