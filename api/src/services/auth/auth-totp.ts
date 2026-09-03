/**
 * auth-totp — TOTP two-factor enrolment, confirmation and validation.
 * Owns: generating a secret, confirming enrolment with a live code, validating
 * a code during login, and disabling 2FA.
 * Does NOT own: how a recovery code is made, checked or spent (auth-recovery.ts).
 * Issuing a set does live here, next to the two-factor state that decides
 * whether an account may hold one at all.
 * Enrolment is two-step by design. The new secret is written to
 * `pendingTotpSecretEncrypted` and only promoted once the user proves they can
 * generate a code from it — a one-step enable can lock a user out of their own
 * account if the QR never scanned correctly.
 * Secrets are AES-256-GCM encrypted at rest and the provisioning URI is derived
 * on demand, never stored.
 */
import argon2 from 'argon2';
import { ObjectId, type WithId } from 'mongodb';
import { Secret, TOTP } from 'otpauth';
import type { UserDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';
import { decryptSecret, encryptSecret } from '@/lib/crypto.js';
import { getDb } from '@/lib/db.js';
import { generateRecoveryCodes } from '@/services/auth/auth-recovery.js';
import { issueSession, type AuthResult } from '@/services/auth/auth-tokens.js';

export type TotpEnrolment = {
    secret: string;
    uri: string;
};

export async function beginTotpEnrolment(userId: ObjectId): Promise<TotpEnrolment> {
    const user = await requireUser(userId);
    if (user.totpEnabled) {
        throw new AppError(409, 'TWO_FA_ALREADY_ENABLED', 'Two-factor authentication is already enabled');
    }

    const secret = new Secret({ size: 20 });
    await getDb()
        .collection<UserDoc>('Users')
        .updateOne(
            { _id: userId },
            { $set: { pendingTotpSecretEncrypted: encryptSecret(secret.base32), updatedAt: new Date() } },
        );

    return { secret: secret.base32, uri: buildTotp(secret.base32, user.username).toString() };
}

export async function confirmTotpEnrolment(userId: ObjectId, code: string): Promise<{ recoveryCodes: string[] }> {
    const user = await requireUser(userId);
    if (user.pendingTotpSecretEncrypted === null) {
        throw new AppError(409, 'TWO_FA_NOT_PENDING', 'No pending two-factor enrolment to confirm');
    }

    const secret = decryptSecret(user.pendingTotpSecretEncrypted);
    assertValidCode(secret, user.username, code);

    const { plaintext, hashes } = await generateRecoveryCodes();

    await getDb()
        .collection<UserDoc>('Users')
        .updateOne(
            { _id: userId },
            {
                $set: {
                    totpSecretEncrypted: user.pendingTotpSecretEncrypted,
                    pendingTotpSecretEncrypted: null,
                    totpEnabled: true,
                    recoveryCodeHashes: hashes,
                    updatedAt: new Date(),
                },
            },
        );

    return { recoveryCodes: plaintext };
}

/**
 * Turn two-factor off. Both factors are required, not just the second one: an
 * attacker holding a live session and the authenticator would otherwise be able
 * to strip the account back to a single factor they already control.
 */
export async function disableTotp(userId: ObjectId, password: string, code: string): Promise<void> {
    const user = await requireUser(userId);
    if (!user.totpEnabled || user.totpSecretEncrypted === null) {
        throw new AppError(409, 'TWO_FA_NOT_ENABLED', 'Two-factor authentication is not enabled');
    }

    await assertPassword(user, password);
    assertValidCode(decryptSecret(user.totpSecretEncrypted), user.username, code);

    await getDb()
        .collection<UserDoc>('Users')
        .updateOne(
            { _id: userId },
            {
                $set: {
                    totpSecretEncrypted: null,
                    pendingTotpSecretEncrypted: null,
                    totpEnabled: false,
                    recoveryCodeHashes: [],
                    updatedAt: new Date(),
                },
            },
        );
}

/**
 * Issue a fresh set of recovery codes, invalidating every previously issued one.
 * Re-authenticated with the password, because each code signs a user in on its
 * own: an access token alone must not be enough to mint standing credentials
 * and silently void the ones the user wrote down.
 * Two-factor must also be on — `disableTotp` clears the codes, so a set on an
 * account without it would be a way in that the user never opted into.
 */
export async function regenerateRecoveryCodes(userId: ObjectId, password: string): Promise<string[]> {
    const user = await requireUser(userId);
    if (!user.totpEnabled || user.totpSecretEncrypted === null) {
        throw new AppError(409, 'TWO_FA_NOT_ENABLED', 'Two-factor authentication is not enabled');
    }

    await assertPassword(user, password);

    const { plaintext, hashes } = await generateRecoveryCodes();
    await getDb()
        .collection<UserDoc>('Users')
        .updateOne({ _id: userId }, { $set: { recoveryCodeHashes: hashes, updatedAt: new Date() } });

    return plaintext;
}

/** Complete a login that stopped at the 2FA challenge. */
export async function validateTotpLogin(
    userId: ObjectId,
    code: string,
    options: { rememberMe: boolean },
): Promise<AuthResult> {
    const user = await requireUser(userId);
    if (!user.totpEnabled || user.totpSecretEncrypted === null) {
        throw new AppError(409, 'TWO_FA_NOT_ENABLED', 'Two-factor authentication is not enabled');
    }

    assertValidCode(decryptSecret(user.totpSecretEncrypted), user.username, code);
    return issueSession(user, options);
}

async function requireUser(userId: ObjectId): Promise<WithId<UserDoc>> {
    const user = await getDb().collection<UserDoc>('Users').findOne({ _id: userId });
    if (user === null) throw new AppError(404, 'USER_NOT_FOUND', `user ${userId.toHexString()} not found`);
    return user;
}

async function assertPassword(user: WithId<UserDoc>, password: string): Promise<void> {
    if (await argon2.verify(user.passwordHash, password)) return;
    throw new AppError(401, 'INCORRECT_PASSWORD', 'Password does not match', {
        logContext: { op: 'auth.reauth', userId: user._id.toHexString() },
        securityEvent: true,
    });
}

function buildTotp(secret: string, username: string): TOTP {
    return new TOTP({
        issuer: config.totp.issuer,
        label: username,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(secret),
    });
}

/**
 * `validate` returns the time-step delta when the code matches and null when it
 * does not — `0` is a valid match, so this must compare against null and never
 * be used as a truthy check.
 */
function assertValidCode(secret: string, username: string, code: string): void {
    const delta = buildTotp(secret, username).validate({ token: code, window: config.totp.window });
    if (delta === null) {
        throw new AppError(401, 'INVALID_TWO_FA_CODE', 'Invalid two-factor code', {
            logContext: { op: 'auth.2fa' },
            securityEvent: true,
        });
    }
}
