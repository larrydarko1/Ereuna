/**
 * auth — API wrappers for /api/auth.
 * `login` is a discriminated union: an account with 2FA enabled gets no tokens,
 * only a short-lived temp token, so a caller must branch on `requires2FA`
 * before reaching for `accessToken`.
 * Every call here establishes or tears down the session, so each one is
 * responsible for putting the client into the matching state — that is why they
 * return the settled session rather than the raw response.
 */
import { api, clearAuth, setAccessToken, setSessionUser, type SessionUser } from '@/api/client';
import { adoptLocale } from '@/i18n';

export type LoginResult = { requires2FA: true; tempToken: string } | { requires2FA: false; user: SessionUser };

type AuthSuccess = { accessToken: string; user: SessionUser };
type LoginResponse = AuthSuccess | { requires2FA: true; tempToken: string };

export async function register(username: string, password: string): Promise<SessionUser> {
    const { data } = await api.post<AuthSuccess>('/auth/register', { username, password });
    return establish(data);
}

export async function login(
    username: string,
    password: string,
    options: { rememberMe: boolean },
): Promise<LoginResult> {
    const { data } = await api.post<LoginResponse>('/auth/login', { username, password, ...options });
    if ('requires2FA' in data) return { requires2FA: true, tempToken: data.tempToken };
    return { requires2FA: false, user: establish(data) };
}

export async function validateTwoFactor(
    tempToken: string,
    code: string,
    options: { rememberMe: boolean },
): Promise<SessionUser> {
    const { data } = await api.post<AuthSuccess>('/auth/2fa/validate', { tempToken, code, ...options });
    return establish(data);
}

export async function recover(
    username: string,
    recoveryCode: string,
    options: { rememberMe: boolean },
): Promise<SessionUser> {
    const { data } = await api.post<AuthSuccess>('/auth/recover', { username, recoveryCode, ...options });
    return establish(data);
}

/**
 * End the session. The local state is cleared whatever the server says: a
 * network failure must not leave the client believing it is still signed in.
 */
export async function logout(): Promise<void> {
    try {
        await api.post('/auth/logout');
    } finally {
        clearAuth();
    }
}

function establish(result: AuthSuccess): SessionUser {
    setAccessToken(result.accessToken);
    setSessionUser(result.user);
    adoptLocale(result.user.language);
    return result.user;
}
