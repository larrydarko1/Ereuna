/**
 * The API client — one axios singleton every domain module goes through.
 * Session model, which is why the access token is never persisted:
 *   • The access token lives in memory only. A refresh, a new tab or a crash
 *     loses it, and that is the point — it cannot be read out of storage by
 *     anything that manages to run script on the page.
 *   • The refresh token is an httpOnly cookie scoped to /api/auth, so the
 *     browser sends it to the refresh endpoint and nowhere else, and script
 *     cannot read it at all.
 *   • `ereuna-user` in localStorage is a hint, not a credential: it records
 *     that a session probably exists so the app can attempt a silent refresh
 *     at boot instead of flashing the sign-in page. Every route is enforced
 *     server-side regardless of what it says.
 * Errors: the API sends a stable `code` and never English. Every response is
 * localised here, once, so no call site has to know the error contract.
 */
import axios, { isAxiosError, type AxiosResponse } from 'axios';

import type { SessionUser } from '@ereuna/shared';
import { isErrorCode, isRecord } from '@ereuna/shared';

import { i18n } from '@/i18n';

export type ApiResult<T> = Promise<AxiosResponse<T>>;

const USER_KEY = 'ereuna-user';

const sessionListeners = new Set<() => void>();

export const api = axios.create({
    baseURL: '/api',
    withCredentials: true, // carries the httpOnly refresh cookie
});

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function findAccessToken(): string | null {
    return accessToken;
}

export function setAccessToken(token: string | null): void {
    accessToken = token;
}

export function setSessionUser(user: SessionUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** The cached session hint, or null when there is nothing usable stored. */
export function findSessionUser(): SessionUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (raw === null) return null;
    try {
        const stored: unknown = JSON.parse(raw);
        if (isSessionUser(stored)) return stored;
    } catch {
        // Unparseable: dropped below, like a hint of the wrong shape
    }
    localStorage.removeItem(USER_KEY);
    return null;
}

export function isAuthenticated(): boolean {
    return findSessionUser() !== null;
}

/**
 * Run when the session ends, so module-scoped caches can drop what they hold.
 * Anything cached for "the user" outlives a sign-out otherwise, and the next
 * person to sign in on this browser inherits it.
 */
export function onSessionCleared(listener: () => void): void {
    sessionListeners.add(listener);
}

export function clearAuth(): void {
    accessToken = null;
    localStorage.removeItem(USER_KEY);
    for (const listener of sessionListeners) listener();
}

/**
 * Restore the session at boot, before the first route resolves.
 * Returns whether a live session was recovered, so the router can decide
 * without a second round trip.
 */
export async function initAuth(): Promise<boolean> {
    if (!isAuthenticated()) return false;
    return (await silentRefresh()) !== null;
}

/** The localised message for a rejected request, or `fallback` when there is none. */
export function apiErrorMessage(err: unknown, fallback: string): string {
    const message = errorBody(err)?.['error'];
    return typeof message === 'string' && message !== '' ? message : fallback;
}

/** The raw error code, for the rare caller that must branch on which failure it was. */
export function apiErrorCode(err: unknown): string | null {
    const code = errorBody(err)?.['code'];
    return typeof code === 'string' ? code : null;
}

/** The JSON body of a failed API call, when it has one. */
function errorBody(err: unknown): Record<string, unknown> | undefined {
    if (!isAxiosError<unknown>(err)) return undefined;
    const data = err.response?.data;
    return isRecord(data) ? data : undefined;
}

/** The stored session hint, checked: it is whatever an older build or another tab left in storage. */
function isSessionUser(value: unknown): value is SessionUser {
    return (
        isRecord(value) &&
        typeof value['id'] === 'string' &&
        typeof value['username'] === 'string' &&
        typeof value['language'] === 'string' &&
        typeof value['twoFactorEnabled'] === 'boolean' &&
        typeof value['passwordResetRequired'] === 'boolean'
    );
}

/**
 * Replace the wire code with a message the user can read.
 * The original code is preserved on `data.code` first, so a caller that needs
 * to branch on the failure still can — localisation must not destroy the one
 * machine-readable field in the response.
 */
function localizeApiError(err: unknown): void {
    const data = errorBody(err);
    const code = data?.['error'];
    if (data === undefined || typeof code !== 'string') return;

    data['code'] = code;
    const key = `errors.${code}`;
    const params = data['params'];
    if (i18n.global.te(key)) {
        data['error'] = i18n.global.t(key, isRecord(params) ? params : {});
    } else if (isErrorCode(code) || /^[A-Z][A-Z0-9_]+$/.test(code)) {
        // A code with no translation yet. Show something human rather than
        // ever putting a raw SCREAMING_SNAKE code in front of a user.
        data['error'] = i18n.global.t('errors.INTERNAL');
    }
}

/**
 * Exchange the refresh cookie for a fresh access token.
 * Concurrent callers share one in-flight request: a page that fires six
 * requests on mount must not fire six refreshes, and with rotating refresh
 * tokens the losers of that race would be rejected as reuse.
 */
async function silentRefresh(): Promise<string | null> {
    refreshPromise ??= axios
        .post<{ accessToken: string }>('/api/auth/refresh', null, { withCredentials: true })
        .then((res) => {
            accessToken = res.data.accessToken;
            return accessToken;
        })
        .catch(() => {
            clearAuth();
            return null;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

api.interceptors.request.use((config) => {
    if (accessToken !== null) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (err: unknown) => {
        const original = isAxiosError(err) ? err.config : undefined;
        const status = isAxiosError(err) ? err.response?.status : undefined;
        // /auth/* is excluded: a failed sign-in is an answer, not an expired
        // session, and refreshing on it would turn one bad password into a
        // pointless round trip.
        const isAuthRoute = original?.url?.startsWith('/auth/') === true;

        if (status === 401 && original !== undefined && original._retry !== true && !isAuthRoute) {
            original._retry = true;
            const token = await silentRefresh();
            if (token !== null) {
                original.headers.Authorization = `Bearer ${token}`;
                return api(original);
            }
            window.location.href = '/login';
        }

        localizeApiError(err);
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- an interceptor re-rejects what it caught; wrapping it would hide the AxiosError callers read
        return Promise.reject(err);
    },
);

declare module 'axios' {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- axios declares this as an interface; only an interface merges
    interface InternalAxiosRequestConfig {
        /** Set on a request the 401 handler has already retried once; axios copies it onto the retry */
        _retry?: boolean;
    }
}
