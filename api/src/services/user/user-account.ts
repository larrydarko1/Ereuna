/** user-account — password, username, and account deletion. */
import argon2 from 'argon2';
import { ObjectId, type WithId } from 'mongodb';
import type {
    ChartDrawingDoc,
    NoteDoc,
    PortfolioDoc,
    PositionDoc,
    ScreenerDoc,
    TradeDoc,
    UserDoc,
    WatchlistDoc,
} from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { invalidatePrefix } from '@/lib/cache.js';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { revokeAllUserTokens, toAuthUser, type AuthUser } from '@/services/auth/auth-tokens.js';

export async function getAccount(userId: ObjectId): Promise<AuthUser> {
    return toAuthUser(await requireUser(userId));
}

export async function changePassword(userId: ObjectId, currentPassword: string, newPassword: string): Promise<void> {
    const user = await requireUser(userId);

    if (!(await argon2.verify(user.passwordHash, currentPassword))) {
        throw new AppError(401, 'INCORRECT_PASSWORD', 'Current password does not match', {
            logContext: { op: 'user.changePassword', userId: userId.toHexString() },
            securityEvent: true,
        });
    }

    const now = new Date();
    await getDb()
        .collection<UserDoc>('Users')
        .updateOne(
            { _id: userId },
            {
                $set: {
                    passwordHash: await argon2.hash(newPassword, config.argon2),
                    passwordChangedAt: now,
                    updatedAt: now,
                },
            },
        );

    await revokeAllUserTokens(userId);
}

export async function changeUsername(userId: ObjectId, password: string, newUsername: string): Promise<AuthUser> {
    const user = await requireUser(userId);

    if (!(await argon2.verify(user.passwordHash, password))) {
        throw new AppError(401, 'INCORRECT_PASSWORD', 'Password does not match', {
            logContext: { op: 'user.changeUsername', userId: userId.toHexString() },
            securityEvent: true,
        });
    }

    const users = getDb().collection<UserDoc>('Users');
    const usernameLower = newUsername.toLowerCase();

    const taken = await users.findOne({ usernameLower, _id: { $ne: userId } }, { projection: { _id: 1 } });
    if (taken !== null) throw new AppError(409, 'USERNAME_TAKEN', `username ${newUsername} already registered`);

    const updated = await users.findOneAndUpdate(
        { _id: userId },
        { $set: { username: newUsername, usernameLower, updatedAt: new Date() } },
        { returnDocument: 'after' },
    );

    if (updated === null) throw new AppError(404, 'USER_NOT_FOUND', `user ${userId.toHexString()} not found`);
    return toAuthUser(updated);
}

export async function deleteAccount(userId: ObjectId, password: string): Promise<void> {
    const user = await requireUser(userId);

    if (!(await argon2.verify(user.passwordHash, password))) {
        throw new AppError(401, 'INCORRECT_PASSWORD', 'Password does not match', {
            logContext: { op: 'user.deleteAccount', userId: userId.toHexString() },
            securityEvent: true,
        });
    }

    await revokeAllUserTokens(userId);

    const db = getDb();
    await Promise.all([
        db.collection<ScreenerDoc>('Screeners').deleteMany({ userId }),
        db.collection<WatchlistDoc>('Watchlists').deleteMany({ userId }),
        db.collection<PortfolioDoc>('Portfolios').deleteMany({ userId }),
        db.collection<PositionDoc>('Positions').deleteMany({ userId }),
        db.collection<TradeDoc>('Trades').deleteMany({ userId }),
        db.collection<NoteDoc>('Notes').deleteMany({ userId }),
        db.collection<ChartDrawingDoc>('ChartDrawings').deleteMany({ userId }),
    ]);

    await db.collection<UserDoc>('Users').deleteOne({ _id: userId });
    await invalidatePrefix(`u:${userId.toHexString()}:`);
}

export async function requireUser(userId: ObjectId): Promise<WithId<UserDoc>> {
    const user = await getDb().collection<UserDoc>('Users').findOne({ _id: userId });
    if (user === null) throw new AppError(404, 'USER_NOT_FOUND', `user ${userId.toHexString()} not found`);
    return user;
}
