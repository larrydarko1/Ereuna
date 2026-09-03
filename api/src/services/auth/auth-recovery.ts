/**
 * auth-recovery — single-use recovery codes.
 * Ereuna accounts carry no email address, so there is no "email me a reset
 * link" path: recovery codes are the only way back into an account whose
 * authenticator or password is lost. That makes them a credential in their own
 * right, and they are treated like one — Argon2id-hashed at rest, single-use,
 * and shown exactly once at generation.
 * Issuing a set is not here: it is only allowed while two-factor is on, so it
 * sits in `auth-totp.ts` with the state that decides it.
 * A code spent here signs the user in with no password, so it also marks the
 * account `passwordResetRequired` — see `setPasswordAfterRecovery`.
 */
import crypto from 'crypto';
import argon2 from 'argon2';
import { ObjectId } from 'mongodb';
import type { UserDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { issueSession, type AuthResult } from '@/services/auth/auth-tokens.js';
import { throttleKey, assertLoginAllowed, clearLoginFailures, recordLoginFailure } from '@/services/auth/login-throttle.js';

/** Codes are grouped for legibility when written down; the groups are cosmetic. */
const GROUPS = 3;
const GROUP_CHARS = 4;
/** Crockford base32 minus the characters that misread when transcribed by hand. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type RecoveryCodeSet = {
    plaintext: string[];
    hashes: string[];
};

export async function generateRecoveryCodes(): Promise<RecoveryCodeSet> {
    const plaintext = Array.from({ length: config.totp.recoveryCodeCount }, generateCode);
    const hashes = await Promise.all(plaintext.map((code) => argon2.hash(code, config.argon2)));
    return { plaintext, hashes };
}

export async function loginWithRecoveryCode(
    username: string,
    code: string,
    options: { rememberMe: boolean },
): Promise<AuthResult> {
    const key = throttleKey(username);
    await assertLoginAllowed(key);

    const users = getDb().collection<UserDoc>('Users');
    const user = await users.findOne({ usernameLower: username.trim().toLowerCase() });
    const normalised = code.trim().toUpperCase();

    const matchedHash =
        user === null ? null : await findMatchingHash(user.recoveryCodeHashes, normalised);

    if (user === null || matchedHash === null) {
        const attempt = await recordLoginFailure(key);
        throw new AppError(401, 'INVALID_RECOVERY_CODE', 'Invalid recovery code', {
            logContext: { op: 'auth.recovery', attempt },
            securityEvent: true,
        });
    }

    // Consume the code first: $pull on the specific hash is atomic, so a
    // concurrent replay finds nothing left to match. The same write raises
    // `passwordResetRequired`, because this session was opened without one
    const consumed = await users.updateOne(
        { _id: user._id, recoveryCodeHashes: matchedHash },
        {
            $pull: { recoveryCodeHashes: matchedHash },
            $set: { passwordResetRequired: true, updatedAt: new Date() },
        },
    );

    if (consumed.modifiedCount === 0) {
        throw new AppError(401, 'INVALID_RECOVERY_CODE', 'Recovery code already used', {
            logContext: { op: 'auth.recovery' },
            securityEvent: true,
        });
    }

    await clearLoginFailures(key);
    // `user` predates the write above; issue the session from the state the
    // client has to act on, not the one that was read
    return issueSession({ ...user, passwordResetRequired: true }, options);
}

/** How many codes the user has left, for the account security screen. */
export async function countRemainingCodes(userId: ObjectId): Promise<number> {
    const user = await getDb()
        .collection<UserDoc>('Users')
        .findOne({ _id: userId }, { projection: { recoveryCodeHashes: 1 } });
    return user?.recoveryCodeHashes.length ?? 0;
}

async function findMatchingHash(hashes: string[], code: string): Promise<string | null> {
    const results = await Promise.all(hashes.map((hash) => argon2.verify(hash, code).catch(() => false)));
    const index = results.indexOf(true);
    return index === -1 ? null : (hashes[index] ?? null);
}

function generateCode(): string {
    const groups: string[] = [];
    for (let group = 0; group < GROUPS; group += 1) {
        const bytes = crypto.randomBytes(GROUP_CHARS);
        let chars = '';
        for (const byte of bytes) chars += ALPHABET[byte % ALPHABET.length];
        groups.push(chars);
    }
    return groups.join('-');
}
