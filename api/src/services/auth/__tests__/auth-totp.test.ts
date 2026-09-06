import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId, type WithId } from 'mongodb';
import { Secret, TOTP } from 'otpauth';
import type { UserDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import { fakeArgon2, hashOf } from '@/__tests__/support/argon2.js';

const db: { current: DbStub } = { current: fakeDb() };
const issued: { calls: unknown[] } = { calls: [] };

vi.mock('argon2', () => ({ default: fakeArgon2 }));
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/services/auth/auth-tokens.js', () => ({
    issueSession: (...args: unknown[]) => {
        issued.calls.push(args);
        return Promise.resolve({ accessToken: 'access', refreshToken: 'refresh', user: { id: 'x' } });
    },
}));
vi.mock('@/services/auth/auth-recovery.js', () => ({
    generateRecoveryCodes: () => Promise.resolve({ plaintext: ['AAAA-BBBB-CCCC'], hashes: [hashOf('AAAA-BBBB-CCCC')] }),
}));

const { beginTotpEnrolment, confirmTotpEnrolment, disableTotp, regenerateRecoveryCodes, validateTotpLogin } =
    await import('@/services/auth/auth-totp.js');
const { config } = await import('@/lib/config.js');
const { encryptSecret } = await import('@/lib/crypto.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');
const SECRET = new Secret({ size: 20 }).base32;

/** A code the service will accept for `SECRET`, at the current instant. */
const liveCode = (secret = SECRET): string =>
    new TOTP({
        issuer: config.totp.issuer,
        label: 'Larry',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(secret),
    }).generate();

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
        ...overrides,
    } as WithId<UserDoc>;
}

const written = (): Record<string, unknown> =>
    (db.current.of('Users').writes[0]?.args[1] as { $set: Record<string, unknown> }).$set;

beforeEach(() => {
    db.current = fakeDb();
    issued.calls = [];
});

describe('beginTotpEnrolment', () => {
    it('stores the new secret as pending, not as the live one', async () => {
        db.current = fakeDb({ Users: [user()] });
        await beginTotpEnrolment(USER_ID);

        const set = written();
        expect(set.pendingTotpSecretEncrypted).toBeTypeOf('string');
        expect(set).not.toHaveProperty('totpEnabled');
        expect(set).not.toHaveProperty('totpSecretEncrypted');
    });

    it('encrypts the secret at rest', async () => {
        db.current = fakeDb({ Users: [user()] });
        const { secret } = await beginTotpEnrolment(USER_ID);
        expect(written().pendingTotpSecretEncrypted).not.toContain(secret);
    });

    it('returns a provisioning uri derived on demand, carrying the issuer and the username', async () => {
        db.current = fakeDb({ Users: [user()] });
        const { secret, uri } = await beginTotpEnrolment(USER_ID);
        const parsed = new URL(uri);

        expect(parsed.protocol).toBe('otpauth:');
        expect(decodeURIComponent(parsed.pathname)).toContain('Larry');
        expect(parsed.searchParams.get('issuer')).toBe(config.totp.issuer);
        expect(parsed.searchParams.get('secret')).toBe(secret);
    });

    it('refuses when two-factor is already on', async () => {
        db.current = fakeDb({ Users: [user({ totpEnabled: true })] });
        await expect(beginTotpEnrolment(USER_ID)).rejects.toMatchObject({ code: 'TWO_FA_ALREADY_ENABLED' });
    });

    it('refuses for a user that does not exist', async () => {
        db.current = fakeDb({ Users: [] });
        db.current.of('Users').results.findOne = null;
        await expect(beginTotpEnrolment(USER_ID)).rejects.toMatchObject({ code: 'USER_NOT_FOUND', status: 404 });
    });
});

describe('confirmTotpEnrolment', () => {
    const pending = (): WithId<UserDoc> => user({ pendingTotpSecretEncrypted: encryptSecret(SECRET) });

    it('promotes the pending secret and turns two-factor on', async () => {
        db.current = fakeDb({ Users: [pending()] });
        await confirmTotpEnrolment(USER_ID, liveCode());

        const set = written();
        expect(set.totpEnabled).toBe(true);
        expect(set.pendingTotpSecretEncrypted).toBeNull();
        expect(set.totpSecretEncrypted).toBeTypeOf('string');
    });

    it('issues a recovery set at the same time, shown exactly once', async () => {
        db.current = fakeDb({ Users: [pending()] });
        await expect(confirmTotpEnrolment(USER_ID, liveCode())).resolves.toEqual({
            recoveryCodes: ['AAAA-BBBB-CCCC'],
        });
        expect(written().recoveryCodeHashes).toEqual([hashOf('AAAA-BBBB-CCCC')]);
    });

    it('refuses a wrong code and changes nothing — a one-step enable can lock a user out', async () => {
        db.current = fakeDb({ Users: [pending()] });
        await expect(confirmTotpEnrolment(USER_ID, '000000')).rejects.toMatchObject({ code: 'INVALID_TWO_FA_CODE' });
        expect(db.current.of('Users').writes).toEqual([]);
    });

    it('refuses when there is no pending enrolment', async () => {
        db.current = fakeDb({ Users: [user()] });
        await expect(confirmTotpEnrolment(USER_ID, '000000')).rejects.toMatchObject({ code: 'TWO_FA_NOT_PENDING' });
    });
});

describe('validateTotpLogin', () => {
    const enabled = (): WithId<UserDoc> => user({ totpEnabled: true, totpSecretEncrypted: encryptSecret(SECRET) });

    it('completes the login with a live code', async () => {
        db.current = fakeDb({ Users: [enabled()] });
        await expect(validateTotpLogin(USER_ID, liveCode(), { rememberMe: true })).resolves.toMatchObject({
            accessToken: 'access',
        });
        expect(issued.calls).toHaveLength(1);
    });

    it('passes the remember-me choice through to the session', async () => {
        db.current = fakeDb({ Users: [enabled()] });
        await validateTotpLogin(USER_ID, liveCode(), { rememberMe: false });
        expect((issued.calls[0] as unknown[])[1]).toEqual({ rememberMe: false });
    });

    it('refuses a wrong code', async () => {
        db.current = fakeDb({ Users: [enabled()] });
        await expect(validateTotpLogin(USER_ID, '000000', { rememberMe: true })).rejects.toMatchObject({
            code: 'INVALID_TWO_FA_CODE',
            status: 401,
        });
    });

    it('refuses when two-factor is not on for the account', async () => {
        db.current = fakeDb({ Users: [user()] });
        await expect(validateTotpLogin(USER_ID, '000000', { rememberMe: true })).rejects.toMatchObject({
            code: 'TWO_FA_NOT_ENABLED',
        });
    });

    it('refuses when the flag is on but the secret is gone', async () => {
        db.current = fakeDb({ Users: [user({ totpEnabled: true, totpSecretEncrypted: null })] });
        await expect(validateTotpLogin(USER_ID, '000000', { rememberMe: true })).rejects.toMatchObject({
            code: 'TWO_FA_NOT_ENABLED',
        });
    });
});

describe('disableTotp', () => {
    const enabled = (): WithId<UserDoc> => user({ totpEnabled: true, totpSecretEncrypted: encryptSecret(SECRET) });

    it('clears the secret, the flag and the recovery set together', async () => {
        db.current = fakeDb({ Users: [enabled()] });
        await disableTotp(USER_ID, 'Str0ng!pass', liveCode());

        expect(written()).toMatchObject({
            totpSecretEncrypted: null,
            pendingTotpSecretEncrypted: null,
            totpEnabled: false,
            recoveryCodeHashes: [],
        });
    });

    it('requires the password as well as the code — a live session must not strip a factor', async () => {
        db.current = fakeDb({ Users: [enabled()] });
        await expect(disableTotp(USER_ID, 'wrong', liveCode())).rejects.toMatchObject({
            code: 'INCORRECT_PASSWORD',
            status: 401,
        });
        expect(db.current.of('Users').writes).toEqual([]);
    });

    it('requires the code as well as the password', async () => {
        db.current = fakeDb({ Users: [enabled()] });
        await expect(disableTotp(USER_ID, 'Str0ng!pass', '000000')).rejects.toMatchObject({
            code: 'INVALID_TWO_FA_CODE',
        });
        expect(db.current.of('Users').writes).toEqual([]);
    });

    it('refuses when two-factor is not on', async () => {
        db.current = fakeDb({ Users: [user()] });
        await expect(disableTotp(USER_ID, 'Str0ng!pass', '000000')).rejects.toMatchObject({
            code: 'TWO_FA_NOT_ENABLED',
        });
    });
});

describe('regenerateRecoveryCodes', () => {
    const enabled = (): WithId<UserDoc> => user({ totpEnabled: true, totpSecretEncrypted: encryptSecret(SECRET) });

    it('replaces the whole set and returns the new codes once', async () => {
        db.current = fakeDb({ Users: [enabled()] });
        await expect(regenerateRecoveryCodes(USER_ID, 'Str0ng!pass')).resolves.toEqual(['AAAA-BBBB-CCCC']);
        expect(written().recoveryCodeHashes).toEqual([hashOf('AAAA-BBBB-CCCC')]);
    });

    it('re-authenticates with the password — an access token alone must not void the written-down set', async () => {
        db.current = fakeDb({ Users: [enabled()] });
        await expect(regenerateRecoveryCodes(USER_ID, 'wrong')).rejects.toMatchObject({ code: 'INCORRECT_PASSWORD' });
        expect(db.current.of('Users').writes).toEqual([]);
    });

    it('refuses on an account without two-factor — the codes would be a way in nobody opted into', async () => {
        db.current = fakeDb({ Users: [user()] });
        await expect(regenerateRecoveryCodes(USER_ID, 'Str0ng!pass')).rejects.toMatchObject({
            code: 'TWO_FA_NOT_ENABLED',
        });
    });

    it('refuses for a user that does not exist', async () => {
        db.current = fakeDb({ Users: [] });
        db.current.of('Users').results.findOne = null;
        await expect(regenerateRecoveryCodes(USER_ID, 'Str0ng!pass')).rejects.toThrow(AppError);
    });
});
