/**
 * Authentication routes — mounted at /api/auth
 * POST /api/auth/register     — create an account, issue tokens
 * POST /api/auth/login        — verify credentials, issue tokens or a 2FA challenge
 * POST /api/auth/2fa/validate — complete a 2FA login with a TOTP code
 * POST /api/auth/recover      — log in with a single-use recovery code
 * POST /api/auth/refresh      — exchange the refresh cookie for a new access token
 * POST /api/auth/logout       — revoke the refresh token family, clear the cookie
 */
import { Router, type CookieOptions, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';
import { passwordSchema, requiredString, usernameSchema } from '@/lib/schemas.js';
import { validated } from '@/middleware/validate.js';
import * as authService from '@/services/auth/index.js';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/auth';

const registerBody = z.object({
    username: usernameSchema,
    password: passwordSchema,
});

const loginBody = z.object({
    username: requiredString('Username is required'),
    password: requiredString('Password is required'),
    rememberMe: z.boolean().optional(),
});

const twoFactorBody = z.object({
    tempToken: requiredString('Temp token is required'),
    code: requiredString('Two-factor code is required'),
    rememberMe: z.boolean().optional(),
});

const recoverBody = z.object({
    username: requiredString('Username is required'),
    recoveryCode: requiredString('Recovery code is required'),
    rememberMe: z.boolean().optional(),
});

export const router = Router();

router.post(
    '/register',
    ...validated({ body: registerBody }, async (req, res): Promise<void> => {
        const result = await authService.registerUser(req.body.username, req.body.password);
        setRefreshCookie(res, result.refreshToken, result.refreshMaxAge);
        res.status(201).json({ accessToken: result.accessToken, user: result.user });
    }),
);

router.post(
    '/login',
    ...validated({ body: loginBody }, async (req, res): Promise<void> => {
        const { username, password, rememberMe } = req.body;
        const result = await authService.loginUser(username, password, { rememberMe: rememberMe === true });

        if (result.requires2FA) {
            res.json({ requires2FA: true, tempToken: result.tempToken });
            return;
        }

        setRefreshCookie(res, result.refreshToken, result.refreshMaxAge);
        res.json({ accessToken: result.accessToken, user: result.user });
    }),
);

router.post(
    '/2fa/validate',
    ...validated({ body: twoFactorBody }, async (req, res): Promise<void> => {
        const { tempToken, code, rememberMe } = req.body;
        const userId = authService.verify2FATempToken(tempToken);
        const result = await authService.validateTotpLogin(new ObjectId(userId), code, {
            rememberMe: rememberMe === true,
        });
        setRefreshCookie(res, result.refreshToken, result.refreshMaxAge);
        res.json({ accessToken: result.accessToken, user: result.user });
    }),
);

router.post(
    '/recover',
    ...validated({ body: recoverBody }, async (req, res): Promise<void> => {
        const { username, recoveryCode, rememberMe } = req.body;
        const result = await authService.loginWithRecoveryCode(username, recoveryCode, {
            rememberMe: rememberMe === true,
        });
        setRefreshCookie(res, result.refreshToken, result.refreshMaxAge);
        res.json({ accessToken: result.accessToken, user: result.user });
    }),
);

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
    const rawToken = readRefreshCookie(req);
    if (rawToken === null) {
        throw new AppError(401, 'NO_REFRESH_TOKEN', 'No refresh token cookie present');
    }

    const result = await authService.rotateRefreshToken(rawToken);
    setRefreshCookie(res, result.refreshToken, result.refreshMaxAge);
    res.json({ accessToken: result.accessToken });
});

/**
 * Logout always answers 200, whether or not the cookie was valid. A caller
 * trying to end a session has nothing to do with a failure, and reporting one
 * would tell an unauthenticated caller whether a token it holds is live.
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
    const rawToken = readRefreshCookie(req);
    if (rawToken !== null) await authService.revokeRefreshToken(rawToken);
    clearRefreshCookie(res);
    res.json({ ok: true });
});

function readRefreshCookie(req: Request): string | null {
    const raw = (req.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE];
    return typeof raw === 'string' && raw !== '' ? raw : null;
}

/**
 * `maxAge` is omitted when the user did not ask to be remembered, making this a
 * session cookie that dies with the browser. The server-side record still
 * carries its own 24-hour ceiling, so a cookie that outlives the browser by any
 * means is not a longer session.
 */
function setRefreshCookie(res: Response, token: string, maxAge?: number): void {
    const options: CookieOptions = {
        httpOnly: true,
        secure: !config.isDev,
        sameSite: 'strict',
        path: REFRESH_COOKIE_PATH,
        ...(maxAge !== undefined ? { maxAge } : {}),
    };
    res.cookie(REFRESH_COOKIE, token, options);
}

function clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, {
        httpOnly: true,
        secure: !config.isDev,
        sameSite: 'strict',
        path: REFRESH_COOKIE_PATH,
    });
}
