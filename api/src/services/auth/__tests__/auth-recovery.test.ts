import { beforeEach, describe, expect, it, vi } from 'vitest';
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
const issued: { calls: { user: WithId<UserDoc>; options: { rememberMe: boolean } }[] } = { calls: [] };

vi.mock('argon2', () => ({ default: fakeArgon2 }));
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/services/auth/auth-tokens.js', () => ({
    issueSession: (user: WithId<UserDoc>, options: { rememberMe: boolean }) => {
        issued.calls.push({ user, options });
        return Promise.resolve({ accessToken: 'access', refreshToken: 'refresh', user: { id: 'x' } });
    },
}));
vi.mock('@/services/auth/login-throttle.js', () => ({
    throttleKey: (username: string) => `key:${username.toLowerCase()}`,
    assertLoginAllowed: () => {
        if (throttle.locked) return Promise.reject(new AppError(429, 'RATE_LIMITED', 'locked'));
        return Promise.resolve();
    },
    recordLoginFailure: (key: string) => {
        throttle.recorded.push(key);
        return Promise.resolve(1);
    },
    clearLoginFailures: (key: string) => {
        throttle.cleared.push(key);
        return Promise.resolve();
    },
}));

const { countRemainingCodes, generateRecoveryCodes, loginWithRecoveryCode } =
    await import('@/services/auth/auth-recovery.js');
const { config } = await import('@/lib/config.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

function user(overrides: Partial<UserDoc> = {}): WithId<UserDoc> {
    return {
        _id: USER_ID,
        username: 'Larry',
        usernameLower: 'larry',
        passwordHash: hashOf('Str0ng!pass'),
        recoveryCodeHashes: [hashOf('AAAA-BBBB-CCCC')],
        totpEnabled: true,
        passwordResetRequired: false,
        language: 'en',
        ...overrides,
    } as WithId<UserDoc>;
}

beforeEach(() => {
    db.current = fakeDb();
    throttle.locked = false;
    throttle.recorded = [];
    throttle.cleared = [];
    issued.calls = [];
});

describe('generateRecoveryCodes', () => {
    it('issues the configured number of codes, with a hash for each', async () => {
        const set = await generateRecoveryCodes();
        expect(set.plaintext).toHaveLength(config.totp.recoveryCodeCount);
        expect(set.hashes).toHaveLength(config.totp.recoveryCodeCount);
    });

    it('formats each code as three groups of four, for writing down by hand', async () => {
        const { plaintext } = await generateRecoveryCodes();
        for (const code of plaintext) expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    });

    it('leaves out the characters that misread when transcribed', async () => {
        const { plaintext } = await generateRecoveryCodes();
        for (const code of plaintext) expect(code).not.toMatch(/[01IO]/);
    });

    it('issues distinct codes', async () => {
        const { plaintext } = await generateRecoveryCodes();
        expect(new Set(plaintext).size).toBe(plaintext.length);
    });

    it('hashes rather than storing the code — a set is a credential in its own right', async () => {
        const { plaintext, hashes } = await generateRecoveryCodes();
        for (const [index, code] of plaintext.entries()) expect(hashes[index]).not.toBe(code);
    });
});

describe('loginWithRecoveryCode', () => {
    it('signs the user in and spends the code', async () => {
        db.current = fakeDb({ Users: [user()] });
        await loginWithRecoveryCode('larry', 'AAAA-BBBB-CCCC', { rememberMe: false });

        const [filter, update] = db.current.of('Users').writes[0]?.args ?? [];
        expect(filter).toEqual({ _id: USER_ID, recoveryCodeHashes: hashOf('AAAA-BBBB-CCCC') });
        expect(update).toMatchObject({ $pull: { recoveryCodeHashes: hashOf('AAAA-BBBB-CCCC') } });
    });

    it('raises passwordResetRequired, because the session was opened without a password', async () => {
        db.current = fakeDb({ Users: [user()] });
        await loginWithRecoveryCode('larry', 'AAAA-BBBB-CCCC', { rememberMe: false });

        const update = db.current.of('Users').writes[0]?.args[1] as { $set: { passwordResetRequired: boolean } };
        expect(update.$set.passwordResetRequired).toBe(true);
    });

    it('issues the session from the state the client has to act on, not the one that was read', async () => {
        db.current = fakeDb({ Users: [user({ passwordResetRequired: false })] });
        await loginWithRecoveryCode('larry', 'AAAA-BBBB-CCCC', { rememberMe: true });
        expect(issued.calls[0]?.user.passwordResetRequired).toBe(true);
        expect(issued.calls[0]?.options).toEqual({ rememberMe: true });
    });

    it('normalises the submitted code, so a lower-case transcription still works', async () => {
        db.current = fakeDb({ Users: [user()] });
        await expect(
            loginWithRecoveryCode('larry', '  aaaa-bbbb-cccc  ', { rememberMe: false }),
        ).resolves.toBeDefined();
    });

    it('clears the failure counter on success', async () => {
        db.current = fakeDb({ Users: [user()] });
        await loginWithRecoveryCode('larry', 'AAAA-BBBB-CCCC', { rememberMe: false });
        expect(throttle.cleared).toEqual(['key:larry']);
    });

    it('refuses when the account is locked, before it looks anything up', async () => {
        throttle.locked = true;
        db.current = fakeDb({ Users: [user()] });
        await expect(loginWithRecoveryCode('larry', 'AAAA-BBBB-CCCC', { rememberMe: false })).rejects.toThrow(AppError);
        expect(db.current.of('Users').filters).toEqual([]);
    });

    it.each([
        ['an unknown username', null],
        ['a user with no codes left', user({ recoveryCodeHashes: [] })],
    ])('answers %s with the same code, so the two are indistinguishable', async (_label, found) => {
        db.current = fakeDb({ Users: [] });
        db.current.of('Users').results.findOne = found;
        await expect(loginWithRecoveryCode('larry', 'AAAA-BBBB-CCCC', { rememberMe: false })).rejects.toMatchObject({
            code: 'INVALID_RECOVERY_CODE',
            status: 401,
        });
    });

    it('refuses a code that matches nothing, and counts the failure', async () => {
        db.current = fakeDb({ Users: [user()] });
        await expect(loginWithRecoveryCode('larry', 'ZZZZ-ZZZZ-ZZZZ', { rememberMe: false })).rejects.toMatchObject({
            code: 'INVALID_RECOVERY_CODE',
        });
        expect(throttle.recorded).toEqual(['key:larry']);
    });

    it('refuses a code a concurrent request already spent', async () => {
        db.current = fakeDb({ Users: [user()] });
        db.current.of('Users').results.updateOne = { acknowledged: true, matchedCount: 0, modifiedCount: 0 };

        await expect(loginWithRecoveryCode('larry', 'AAAA-BBBB-CCCC', { rememberMe: false })).rejects.toThrow(
            'already used',
        );
        expect(issued.calls).toEqual([]);
    });

    it('picks the matching code out of a set of several', async () => {
        db.current = fakeDb({
            Users: [user({ recoveryCodeHashes: [hashOf('AAAA'), hashOf('BBBB'), hashOf('CCCC')] })],
        });
        await loginWithRecoveryCode('larry', 'BBBB', { rememberMe: false });
        expect(db.current.of('Users').writes[0]?.args[1]).toMatchObject({
            $pull: { recoveryCodeHashes: hashOf('BBBB') },
        });
    });

    it('survives a stored hash that argon2 cannot parse', async () => {
        db.current = fakeDb({ Users: [user({ recoveryCodeHashes: ['not-a-hash', hashOf('AAAA')] })] });
        const verify = vi.spyOn(fakeArgon2, 'verify').mockImplementation((hash: string, plain: string) => {
            if (hash === 'not-a-hash') return Promise.reject(new Error('invalid hash'));
            return Promise.resolve(hash === hashOf(plain));
        });

        await expect(loginWithRecoveryCode('larry', 'AAAA', { rememberMe: false })).resolves.toBeDefined();
        verify.mockRestore();
    });
});

describe('countRemainingCodes', () => {
    it('reports how many the user has left', async () => {
        db.current = fakeDb({ Users: [user({ recoveryCodeHashes: [hashOf('A'), hashOf('B')] })] });
        await expect(countRemainingCodes(USER_ID)).resolves.toBe(2);
    });

    it('reports none for a user that does not exist', async () => {
        db.current = fakeDb({ Users: [] });
        db.current.of('Users').results.findOne = null;
        await expect(countRemainingCodes(USER_ID)).resolves.toBe(0);
    });

    it('asks only for the hashes, never the whole document', async () => {
        db.current = fakeDb({ Users: [user()] });
        await countRemainingCodes(USER_ID);
        expect(db.current.of('Users').findOne).toHaveBeenCalledWith(
            { _id: USER_ID },
            { projection: { recoveryCodeHashes: 1 } },
        );
    });
});
