import { beforeEach, describe, expect, it } from 'vitest';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { findAccessToken, findSessionUser, setAccessToken, setSessionUser, type SessionUser } from '@/api/client';
import { login, logout, recover, register, validateTwoFactor } from '@/api/auth';

const mock = mockApi();

const user: SessionUser = {
    id: '507f1f77bcf86cd799439011',
    username: 'larry',
    language: 'fr',
    twoFactorEnabled: false,
    passwordResetRequired: false,
};

const session = { accessToken: 'access', user };

beforeEach(() => {
    setAccessToken(null);
    localStorage.clear();
    i18n.global.locale.value = 'en';
});

describe('register', () => {
    it('establishes the session it was handed', async () => {
        mock.on('POST /api/auth/register', session);

        await expect(register('larry', 'Str0ng!pass')).resolves.toEqual(user);
        expect(mock.last().body).toEqual({ username: 'larry', password: 'Str0ng!pass' });
        expect(findAccessToken()).toBe('access');
        expect(findSessionUser()).toEqual(user);
    });

    it('adopts the language the account carries', async () => {
        mock.on('POST /api/auth/register', session);

        await register('larry', 'Str0ng!pass');

        expect(i18n.global.locale.value).toBe('fr');
    });
});

describe('login', () => {
    it('establishes the session when there is no second factor', async () => {
        mock.on('POST /api/auth/login', session);

        await expect(login('larry', 'pw', { rememberMe: true })).resolves.toEqual({ requires2FA: false, user });
        expect(mock.last().body).toEqual({ username: 'larry', password: 'pw', rememberMe: true });
        expect(findAccessToken()).toBe('access');
    });

    it('establishes nothing when a second factor is still owed', async () => {
        mock.on('POST /api/auth/login', { requires2FA: true, tempToken: 'temp' });

        await expect(login('larry', 'pw', { rememberMe: false })).resolves.toEqual({
            requires2FA: true,
            tempToken: 'temp',
        });
        expect(findAccessToken()).toBeNull();
        expect(findSessionUser()).toBeNull();
    });
});

describe('validateTwoFactor', () => {
    it('completes the login the temp token started', async () => {
        mock.on('POST /api/auth/2fa/validate', session);

        await expect(validateTwoFactor('temp', '123456', { rememberMe: false })).resolves.toEqual(user);
        expect(mock.last().body).toEqual({ tempToken: 'temp', code: '123456', rememberMe: false });
        expect(findAccessToken()).toBe('access');
    });
});

describe('recover', () => {
    it('opens a session from a recovery code', async () => {
        mock.on('POST /api/auth/recover', session);

        await expect(recover('larry', 'abcd-efgh', { rememberMe: false })).resolves.toEqual(user);
        expect(mock.last().body).toEqual({ username: 'larry', recoveryCode: 'abcd-efgh', rememberMe: false });
    });
});

describe('logout', () => {
    it('clears the local session', async () => {
        setAccessToken('access');
        setSessionUser(user);
        mock.on('POST /api/auth/logout', null, { status: 204 });

        await logout();

        expect(findAccessToken()).toBeNull();
        expect(findSessionUser()).toBeNull();
    });

    it('clears it even when the call fails — the client must not think it is still signed in', async () => {
        setAccessToken('access');
        setSessionUser(user);
        mock.on('POST /api/auth/logout', { error: 'INTERNAL' }, { status: 500 });

        await expect(logout()).resolves.toBeUndefined();

        expect(findAccessToken()).toBeNull();
        expect(findSessionUser()).toBeNull();
    });
});
