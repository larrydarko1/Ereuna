/** auth-tokens — registration, login, and the refresh-token rotation lifecycle. */
import crypto from 'crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { ObjectId, type WithId } from 'mongodb';
import type { RefreshTokenDoc, UserDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';
import { sha256 } from '@/lib/crypto.js';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import {
    assertLoginAllowed,
    clearLoginFailures,
    recordLoginFailure,
    throttleKey,
} from '@/services/auth/login-throttle.js';

export type AuthUser = {
    id: string;
    username: string;
    language: string;
    twoFactorEnabled: boolean;
    passwordResetRequired: boolean;
};

export type AuthResult = {
    accessToken: string;
    refreshToken: string;
    refreshMaxAge?: number;
    user: AuthUser;
};

export type LoginResult = ({ requires2FA: false } & AuthResult) | { requires2FA: true; tempToken: string };

/**
 * A real Argon2id hash, generated with the exact parameters in `config.argon2`.
 * Login verifies against this when the username is unknown, so the miss path
 * costs the same wall-clock time as a hit and cannot be timed to enumerate
 * accounts. Regenerate it whenever memoryCost, timeCost or parallelism change,
 * or the two paths diverge again and the check silently stops working.
 */
const DUMMY_HASH = '$argon2id$v=19$m=65536,p=4,t=3$DMPijkJkt9576xz/kVO+dw$gsNWCQ+HEnr0keS4MfQH5s+pdQ6riQ86IAAFIAvDc1k';

/** Project a user document into the block every auth response returns. */
export function toAuthUser(user: WithId<UserDoc>): AuthUser {
    return {
        id: user._id.toHexString(),
        username: user.username,
        language: user.language,
        twoFactorEnabled: user.totpEnabled,
        passwordResetRequired: user.passwordResetRequired,
    };
}

export function verify2FATempToken(token: string): string {
    let payload: { sub: string; type?: string };
    try {
        payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as { sub: string; type?: string };
    } catch {
        throw new AppError(401, 'TWO_FA_TOKEN_INVALID', 'Invalid or expired 2FA token', {
            logContext: { op: 'auth.2fa' },
            securityEvent: true,
        });
    }

    if (payload.type !== '2fa_pending') {
        throw new AppError(401, 'INVALID_TOKEN_TYPE', 'Token is not a 2FA challenge token', {
            logContext: { op: 'auth.2fa' },
            securityEvent: true,
        });
    }
    return payload.sub;
}

export async function registerUser(username: string, password: string): Promise<AuthResult> {
    const db = getDb();
    const users = db.collection<UserDoc>('Users');
    const usernameLower = username.toLowerCase();

    if ((await users.findOne({ usernameLower }, { projection: { _id: 1 } })) !== null) {
        throw new AppError(409, 'USERNAME_TAKEN', `username ${username} already registered`);
    }

    const now = new Date();
    const result = await users.insertOne({
        username,
        usernameLower,
        passwordHash: await argon2.hash(password, config.argon2),
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
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
        passwordChangedAt: null,
    });

    const userId = result.insertedId.toHexString();
    const { rawToken, maxAge } = await createRefreshToken(result.insertedId, { rememberMe: true });

    return {
        accessToken: generateAccessToken(userId),
        refreshToken: rawToken,
        refreshMaxAge: maxAge,
        user: {
            id: userId,
            username,
            language: 'en',
            twoFactorEnabled: false,
            passwordResetRequired: false,
        },
    };
}

export async function loginUser(
    username: string,
    password: string,
    options: { rememberMe: boolean },
): Promise<LoginResult> {
    const key = throttleKey(username);
    await assertLoginAllowed(key);

    const users = getDb().collection<UserDoc>('Users');
    const user = await users.findOne({ usernameLower: username.trim().toLowerCase() });

    // Always verify, even on a miss, so both paths cost the same. Branching on
    // `user` before this point is what turns login into a timing oracle.
    const valid = await argon2.verify(user?.passwordHash ?? DUMMY_HASH, password);

    if (user === null || !valid) {
        const attempt = await recordLoginFailure(key);
        // One code and one message for both failures — an unknown username and
        // a wrong password must be indistinguishable to the caller.
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials', {
            logContext: { op: 'auth.login', attempt, ...(user !== null ? { userId: user._id.toHexString() } : {}) },
            securityEvent: true,
        });
    }

    await clearLoginFailures(key);

    if (user.totpEnabled) {
        return { requires2FA: true, tempToken: generate2FATempToken(user._id.toHexString()) };
    }

    return { requires2FA: false, ...(await issueSession(user, options)) };
}

/**
 * Issue the access + refresh pair for a user who has cleared every factor.
 * Shared by password login, 2FA validation and recovery-code login so the three
 * cannot drift apart on what a completed login does.
 */
export async function issueSession(user: WithId<UserDoc>, options: { rememberMe: boolean }): Promise<AuthResult> {
    await getDb()
        .collection<UserDoc>('Users')
        .updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    const { rawToken, maxAge } = await createRefreshToken(user._id, options);

    return {
        accessToken: generateAccessToken(user._id.toHexString()),
        refreshToken: rawToken,
        refreshMaxAge: maxAge,
        user: toAuthUser(user),
    };
}

export async function rotateRefreshToken(
    rawToken: string,
): Promise<{ accessToken: string; refreshToken: string; refreshMaxAge?: number }> {
    const tokens = getDb().collection<RefreshTokenDoc>('RefreshTokens');
    const tokenHash = sha256(rawToken);

    // Claim the token atomically so two concurrent refreshes cannot both rotate it.
    const record = await tokens.findOneAndUpdate(
        { tokenHash, usedAt: { $exists: false } },
        { $set: { usedAt: new Date() } },
    );

    if (record === null) {
        const replayed = await tokens.findOne({ tokenHash });
        if (replayed !== null) {
            await tokens.deleteMany({ familyId: replayed.familyId });
            logger.warn(
                { userId: replayed.userId.toHexString(), familyId: replayed.familyId },
                'Refresh token reuse detected — token family revoked',
            );
        }
        throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token not recognised', {
            logContext: { op: 'auth.refresh' },
            securityEvent: true,
        });
    }

    if (record.expiresAt.getTime() <= Date.now()) {
        await tokens.deleteMany({ familyId: record.familyId });
        throw new AppError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token past its session ceiling');
    }

    // The new token inherits record.expiresAt. Minting a fresh expiry here is the
    // quietest way to lose the ceiling — nothing errors, and sessions become immortal.
    const { rawToken: newRawToken, maxAge } = await issueRefreshToken(record.userId, {
        rememberMe: record.rememberMe,
        familyId: record.familyId,
        expiresAt: record.expiresAt,
    });

    return {
        accessToken: generateAccessToken(record.userId.toHexString()),
        refreshToken: newRawToken,
        refreshMaxAge: maxAge,
    };
}

/** Revoke the family a token belongs to — logout for that one session. */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
    const tokens = getDb().collection<RefreshTokenDoc>('RefreshTokens');
    const record = await tokens.findOne({ tokenHash: sha256(rawToken) });
    if (record === null) return;
    await tokens.deleteMany({ familyId: record.familyId });
}

/** Revoke every session for a user — password change, 2FA change, account deletion. */
export async function revokeAllUserTokens(userId: ObjectId): Promise<void> {
    await getDb().collection<RefreshTokenDoc>('RefreshTokens').deleteMany({ userId });
}

/** Sign a short-lived access token. The payload carries the user id and nothing else. */
function generateAccessToken(userId: string): string {
    return jwt.sign({ sub: userId }, config.jwt.secret, { expiresIn: config.jwt.accessTokenExpiry });
}

/** Sign the temp token that carries a login across the 2FA challenge (5 min). */
function generate2FATempToken(userId: string): string {
    return jwt.sign({ sub: userId, type: '2fa_pending' }, config.jwt.secret, {
        expiresIn: config.jwt.twoFactorTempExpiry,
    });
}

async function createRefreshToken(
    userId: ObjectId,
    options: { rememberMe: boolean },
): Promise<{ rawToken: string; maxAge?: number }> {
    const { rememberMe } = options;
    const expiresAt = new Date(
        Date.now() + (rememberMe ? config.jwt.refreshTokenExpiry : config.jwt.sessionTokenExpiry),
    );
    return issueRefreshToken(userId, { rememberMe, familyId: crypto.randomUUID(), expiresAt });
}

async function issueRefreshToken(
    userId: ObjectId,
    options: { rememberMe: boolean; familyId: string; expiresAt: Date },
): Promise<{ rawToken: string; maxAge?: number }> {
    const { rememberMe, familyId, expiresAt } = options;
    const rawToken = crypto.randomBytes(40).toString('hex');

    await getDb()
        .collection<RefreshTokenDoc>('RefreshTokens')
        .insertOne({
            tokenHash: sha256(rawToken),
            userId,
            familyId,
            rememberMe,
            expiresAt,
            createdAt: new Date(),
        });

    return { rawToken, maxAge: rememberMe ? Math.max(0, expiresAt.getTime() - Date.now()) : undefined };
}
