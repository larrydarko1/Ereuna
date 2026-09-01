/**
 * JWT authentication middleware.
 * Access tokens are short-lived (15 min) JWTs sent in the Authorization header.
 *   requireAuth  — rejects when the token is missing, invalid or expired
 *   optionalAuth — sets req.userId when a valid token is present, else continues
 * `optionalAuth` is registered globally ahead of the rate limiters so they can
 * key by user id; `requireAuth` is applied per router, which is what makes the
 * set of authenticated route groups auditable in one place (index.ts).
 */
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';

export type AuthRequest = Request & {
    userId?: string;
};

type AccessTokenPayload = {
    sub: string;
};

export function authedUserId(req: Pick<AuthRequest, 'userId'>): ObjectId {
    if (req.userId === undefined || req.userId === '') {
        throw new AppError(401, 'MISSING_TOKEN', 'Missing bearer token', {
            logContext: { op: 'auth.token' },
            securityEvent: true,
        });
    }
    return new ObjectId(req.userId);
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
    const token = bearerToken(req);
    if (token === null) {
        throw new AppError(401, 'MISSING_TOKEN', 'Missing bearer token', {
            logContext: { op: 'auth.token' },
            securityEvent: true,
        });
    }

    const userId = verifyAccessToken(token);
    if (userId === null) {
        throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired access token', {
            logContext: { op: 'auth.token' },
            securityEvent: true,
        });
    }

    req.userId = userId;
    next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
    const token = bearerToken(req);
    if (token !== null) {
        const userId = verifyAccessToken(token);
        if (userId !== null) req.userId = userId;
    }
    next();
}

function bearerToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (header === undefined || !header.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    return token === '' ? null : token;
}

/**
 * Verify and decode an access token, returning the user id or null.
 * The algorithm is pinned: without `algorithms` the token's own header chooses,
 * which is what makes the `alg: none` and RS256-to-HS256 confusion attacks work.
 */
function verifyAccessToken(token: string): string | null {
    try {
        const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as AccessTokenPayload;
        return ObjectId.isValid(payload.sub) ? payload.sub : null;
    } catch {
        return null;
    }
}
