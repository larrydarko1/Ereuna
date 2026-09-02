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
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { isErrorCode } from '@ereuna/shared';
import { i18n } from '@/i18n';

export type ApiResult<T> = Promise<AxiosResponse<T>>;

/** One failed field, as the validate middleware reports it. */
export type FieldError = {
    field: string;
    message: string;
};

export type SessionUser = {
    id: string;
    username: string;
    language: string;
    twoFactorEnabled: boolean;
};

const USER_KEY = 'ereuna-user';

export const api = axios.create({
    baseURL: '/api',
    withCredentials: true, // carries the httpOnly refresh cookie
});

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
const sessionListeners = new Set<() => void>();

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
        return JSON.parse(raw) as SessionUser;
    } catch {
        localStorage.removeItem(USER_KEY);
        return null;
    }
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
    const message = (err as { response?: { data?: { error?: unknown } } }).response?.data?.error;
    return typeof message === 'string' && message !== '' ? message : fallback;
}

/** The per-field messages behind a VALIDATION_FAILED, keyed by field path. */
export function apiFieldErrors(err: unknown): Record<string, string> {
    const errors = (err as { response?: { data?: { errors?: FieldError[] } } }).response?.data?.errors;
    if (!Array.isArray(errors)) return {};
    return Object.fromEntries(errors.map((entry) => [entry.field, entry.message]));
}

/** The raw error code, for the rare caller that must branch on which failure it was. */
export function apiErrorCode(err: unknown): string | null {
    const code = (err as { response?: { data?: { code?: unknown } } }).response?.data?.code;
    return typeof code === 'string' ? code : null;
}

/**
 * Replace the wire code with a message the user can read.
 * The original code is preserved on `data.code` first, so a caller that needs
 * to branch on the failure still can — localisation must not destroy the one
 * machine-readable field in the response.
 */
function localizeApiError(err: unknown): void {
    const data = (err as { response?: { data?: { error?: unknown; code?: string; params?: Record<string, unknown> } } })
        .response?.data;
    if (data === undefined) return;

    const code = data.error;
    if (typeof code !== 'string') return;

    data.code = code;
    const key = `errors.${code}`;
    if (i18n.global.te(key)) {
        data.error = i18n.global.t(key, data.params ?? {});
    } else if (isErrorCode(code) || /^[A-Z][A-Z0-9_]+$/.test(code)) {
        // A code with no translation yet. Show something human rather than
        // ever putting a raw SCREAMING_SNAKE code in front of a user.
        data.error = i18n.global.t('errors.INTERNAL');
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
        const original = (err as { config?: InternalAxiosRequestConfig & { _retry?: boolean } }).config;
        const status = (err as { response?: { status?: number } }).response?.status;
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
        return Promise.reject(err as Error);
    },
);
