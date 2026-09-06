import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import cookieParser from 'cookie-parser';
import { json, quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

const service = {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    verify2FATempToken: vi.fn(),
    validateTotpLogin: vi.fn(),
    loginWithRecoveryCode: vi.fn(),
    rotateRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
};

vi.mock('@/services/auth/index.js', () => service);

const { router } = await import('@/routes/identity/auth.js');
const { AppError } = await import('@/lib/app-error.js');

const USER = '507f1f77bcf86cd799439011';
const STRONG = 'Str0ng!passw0rd';
const session = {
    accessToken: 'access',
    refreshToken: 'refresh',
    refreshMaxAge: 604800000,
    user: { id: USER, username: 'larry' },
};

let harness: Harness;

const refreshCookie = (response: { headers: Headers }): string => response.headers.get('set-cookie') ?? '';

beforeEach(async () => {
    service.registerUser.mockResolvedValue(session);
    service.loginUser.mockResolvedValue({ ...session, requires2FA: false });
    service.verify2FATempToken.mockReturnValue(USER);
    service.validateTotpLogin.mockResolvedValue(session);
    service.loginWithRecoveryCode.mockResolvedValue(session);
    service.rotateRefreshToken.mockResolvedValue(session);
    service.revokeRefreshToken.mockResolvedValue(undefined);
    harness = await serve((app) => app.use('/api/auth', quietLogger, cookieParser(), router));
});

afterEach(async () => {
    await harness.close();
});

describe('POST /api/auth/register', () => {
    it('answers 201 with the access token, and puts the refresh token in a cookie', async () => {
        const response = await harness.call('/api/auth/register', json({ username: 'larry', password: STRONG }));

        expect(response.status).toBe(201);
        expect(response.body).toEqual({ accessToken: 'access', user: session.user });
        expect(refreshCookie(response)).toContain('refreshToken=refresh');
    });

    it('never puts the refresh token in the body', async () => {
        const response = await harness.call('/api/auth/register', json({ username: 'larry', password: STRONG }));

        expect(response.text).not.toContain('refresh');
    });

    it('scopes the cookie to the auth prefix, http-only and same-site strict', async () => {
        const response = await harness.call('/api/auth/register', json({ username: 'larry', password: STRONG }));
        const cookie = refreshCookie(response);

        expect(cookie).toContain('Path=/api/auth');
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=Strict');
    });

    it('refuses a weak password', async () => {
        const response = await harness.call('/api/auth/register', json({ username: 'larry', password: 'weak' }));

        expect(response.status).toBe(422);
        expect(service.registerUser).not.toHaveBeenCalled();
    });
});

describe('POST /api/auth/login', () => {
    it('answers with the session when no second factor is enrolled', async () => {
        const response = await harness.call('/api/auth/login', json({ username: 'larry', password: 'anything' }));

        expect(response.body).toEqual({ accessToken: 'access', user: session.user });
        expect(service.loginUser).toHaveBeenCalledWith('larry', 'anything', { rememberMe: false });
    });

    it('passes rememberMe through', async () => {
        await harness.call('/api/auth/login', json({ username: 'larry', password: 'x', rememberMe: true }));

        expect(service.loginUser).toHaveBeenCalledWith('larry', 'x', { rememberMe: true });
    });

    it('sets no cookie when the login is only half done', async () => {
        service.loginUser.mockResolvedValue({ requires2FA: true, tempToken: 'temp' });
        const response = await harness.call('/api/auth/login', json({ username: 'larry', password: 'x' }));

        expect(response.body).toEqual({ requires2FA: true, tempToken: 'temp' });
        expect(response.headers.get('set-cookie')).toBeNull();
    });

    it('applies no password strength rules — an existing password is whatever it is', async () => {
        const response = await harness.call('/api/auth/login', json({ username: 'larry', password: 'weak' }));

        expect(response.status).toBe(200);
    });

    it('requires both fields', async () => {
        const response = await harness.call('/api/auth/login', json({ username: 'larry' }));

        expect(response.status).toBe(422);
    });
});

describe('POST /api/auth/2fa/validate', () => {
    it('resolves the temp token to a user before validating the code', async () => {
        const response = await harness.call('/api/auth/2fa/validate', json({ tempToken: 'temp', code: '123456' }));

        expect(response.status).toBe(200);
        expect(service.verify2FATempToken).toHaveBeenCalledWith('temp');
        const [userId, code] = service.validateTotpLogin.mock.calls[0] as [{ toHexString: () => string }, string];
        expect(userId.toHexString()).toBe(USER);
        expect(code).toBe('123456');
        expect(refreshCookie(response)).toContain('refreshToken=refresh');
    });

    it('renders a rejected temp token through the error handler', async () => {
        service.verify2FATempToken.mockImplementation(() => {
            throw new AppError(401, 'TWO_FA_TOKEN_INVALID', 'expired');
        });
        const response = await harness.call('/api/auth/2fa/validate', json({ tempToken: 'temp', code: '123456' }));

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'TWO_FA_TOKEN_INVALID' });
    });
});

describe('POST /api/auth/recover', () => {
    it('opens a session from a recovery code', async () => {
        const response = await harness.call(
            '/api/auth/recover',
            json({ username: 'larry', recoveryCode: 'abcd-efgh' }),
        );

        expect(response.body).toEqual({ accessToken: 'access', user: session.user });
        expect(service.loginWithRecoveryCode).toHaveBeenCalledWith('larry', 'abcd-efgh', { rememberMe: false });
    });

    it('requires the code', async () => {
        const response = await harness.call('/api/auth/recover', json({ username: 'larry' }));

        expect(response.status).toBe(422);
    });
});

describe('POST /api/auth/refresh', () => {
    it('exchanges the cookie for a new access token, and rotates the cookie', async () => {
        const response = await harness.call('/api/auth/refresh', {
            method: 'POST',
            headers: { cookie: 'refreshToken=old' },
        });

        expect(response.body).toEqual({ accessToken: 'access' });
        expect(service.rotateRefreshToken).toHaveBeenCalledWith('old');
        expect(refreshCookie(response)).toContain('refreshToken=refresh');
    });

    it('refuses when no cookie is present', async () => {
        const response = await harness.call('/api/auth/refresh', { method: 'POST' });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'NO_REFRESH_TOKEN' });
        expect(service.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('treats an empty cookie as no cookie', async () => {
        const response = await harness.call('/api/auth/refresh', {
            method: 'POST',
            headers: { cookie: 'refreshToken=' },
        });

        expect(response.status).toBe(401);
    });
});

describe('POST /api/auth/logout', () => {
    it('revokes the family and clears the cookie', async () => {
        const response = await harness.call('/api/auth/logout', {
            method: 'POST',
            headers: { cookie: 'refreshToken=old' },
        });

        expect(response.status).toBe(204);
        expect(service.revokeRefreshToken).toHaveBeenCalledWith('old');
        expect(refreshCookie(response)).toContain('refreshToken=;');
    });

    it('succeeds with no cookie — a caller ending a session learns nothing either way', async () => {
        const response = await harness.call('/api/auth/logout', { method: 'POST' });

        expect(response.status).toBe(204);
        expect(service.revokeRefreshToken).not.toHaveBeenCalled();
        expect(refreshCookie(response)).toContain('refreshToken=;');
    });
});
