import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { HttpResponse, http } from 'msw';
import { i18n } from '@/i18n';
import { mockApi, ORIGIN } from '@/__tests__/support/msw';
import {
    api,
    apiErrorCode,
    apiErrorMessage,
    clearAuth,
    findAccessToken,
    findSessionUser,
    initAuth,
    isAuthenticated,
    onSessionCleared,
    setAccessToken,
    setSessionUser,
    type SessionUser,
} from '@/api/client';

const mock = mockApi();

const user: SessionUser = {
    id: '507f1f77bcf86cd799439011',
    username: 'larry',
    language: 'en',
    twoFactorEnabled: false,
    passwordResetRequired: false,
};

beforeEach(() => {
    setAccessToken(null);
    localStorage.clear();
    vi.restoreAllMocks();
});

describe('the access token', () => {
    it('lives in memory and is never persisted', () => {
        setAccessToken('access');

        expect(findAccessToken()).toBe('access');
        expect(JSON.stringify(localStorage)).not.toContain('access');
    });

    it('is sent as a bearer token when there is one', async () => {
        setAccessToken('access');
        mock.on('GET /api/notes', { items: [] });

        await api.get('/notes');

        expect(mock.last().headers.get('authorization')).toBe('Bearer access');
    });

    it('is left off entirely when there is none', async () => {
        mock.on('GET /api/notes', { items: [] });

        await api.get('/notes');

        expect(mock.last().headers.get('authorization')).toBeNull();
    });
});

describe('the session hint', () => {
    it('records that a session probably exists', () => {
        setSessionUser(user);

        expect(findSessionUser()).toEqual(user);
        expect(isAuthenticated()).toBe(true);
    });

    it('answers with nothing when there is nothing stored', () => {
        expect(findSessionUser()).toBeNull();
        expect(isAuthenticated()).toBe(false);
    });

    it('drops a corrupted hint rather than throwing on every read', () => {
        localStorage.setItem('ereuna-user', 'not json');

        expect(findSessionUser()).toBeNull();
        expect(localStorage.getItem('ereuna-user')).toBeNull();
    });
});

describe('clearAuth', () => {
    it('drops the token and the hint together', () => {
        setAccessToken('access');
        setSessionUser(user);

        clearAuth();

        expect(findAccessToken()).toBeNull();
        expect(findSessionUser()).toBeNull();
    });

    it('tells the caches to drop what they hold for the departing user', () => {
        const listener = vi.fn();
        onSessionCleared(listener);

        clearAuth();

        expect(listener).toHaveBeenCalledTimes(1);
    });
});

describe('initAuth', () => {
    it('does not call the server when nothing suggests a session', async () => {
        await expect(initAuth()).resolves.toBe(false);
        expect(mock.calls).toHaveLength(0);
    });

    it('recovers a live session from the refresh cookie', async () => {
        setSessionUser(user);
        mock.on('POST /api/auth/refresh', { accessToken: 'fresh' });

        await expect(initAuth()).resolves.toBe(true);
        expect(findAccessToken()).toBe('fresh');
    });

    it('clears the stale hint when the cookie is no longer good', async () => {
        setSessionUser(user);
        mock.on('POST /api/auth/refresh', { error: 'INVALID_REFRESH_TOKEN' }, { status: 401 });

        await expect(initAuth()).resolves.toBe(false);
        expect(findSessionUser()).toBeNull();
    });
});

describe('the 401 retry', () => {
    it('refreshes once, then replays the original request with the new token', async () => {
        setAccessToken('stale');
        let served = 0;
        mock.server.use(
            http.get(`${ORIGIN}/api/notes`, ({ request }) => {
                served += 1;
                if (request.headers.get('authorization') !== 'Bearer fresh') {
                    return HttpResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 });
                }
                return HttpResponse.json({ items: [] });
            }),
        );
        mock.on('POST /api/auth/refresh', { accessToken: 'fresh' });

        const response = await api.get('/notes');

        expect(response.data).toEqual({ items: [] });
        expect(served).toBe(2);
    });

    it('fires one refresh for a burst of requests, not one each', async () => {
        setAccessToken('stale');
        let refreshes = 0;
        mock.server.use(
            http.get(`${ORIGIN}/api/notes`, ({ request }) =>
                request.headers.get('authorization') === 'Bearer fresh'
                    ? HttpResponse.json({ items: [] })
                    : HttpResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 }),
            ),
            http.post(`${ORIGIN}/api/auth/refresh`, () => {
                refreshes += 1;
                return HttpResponse.json({ accessToken: 'fresh' });
            }),
        );

        await Promise.all([api.get('/notes'), api.get('/notes'), api.get('/notes')]);

        expect(refreshes).toBe(1);
    });

    it('does not retry a second time — a 401 after a refresh is an answer', async () => {
        setAccessToken('stale');
        let served = 0;
        mock.server.use(
            http.get(`${ORIGIN}/api/notes`, () => {
                served += 1;
                return HttpResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 });
            }),
        );
        mock.on('POST /api/auth/refresh', { accessToken: 'fresh' });

        await expect(api.get('/notes')).rejects.toBeDefined();
        expect(served).toBe(2);
    });

    it('does not refresh on a failed sign-in — a bad password is not an expired session', async () => {
        let refreshes = 0;
        mock.server.use(
            http.post(`${ORIGIN}/api/auth/refresh`, () => {
                refreshes += 1;
                return HttpResponse.json({ accessToken: 'fresh' });
            }),
        );
        mock.on('POST /api/auth/login', { error: 'INVALID_CREDENTIALS' }, { status: 401 });

        await expect(api.post('/auth/login', {})).rejects.toBeDefined();
        expect(refreshes).toBe(0);
    });

    it('sends the user to the sign-in page when the refresh fails too', async () => {
        setAccessToken('stale');
        // Redefined rather than spied — jsdom's `location` has no spyable
        // getter — and seeded with the real href, because relative request URLs
        // are resolved against it.
        const original = Object.getOwnPropertyDescriptor(window, 'location');
        const location = { href: window.location.href };
        Object.defineProperty(window, 'location', { configurable: true, value: location });
        onTestFinished(() => {
            if (original !== undefined) Object.defineProperty(window, 'location', original);
        });
        mock.on('GET /api/notes', { error: 'INVALID_TOKEN' }, { status: 401 });
        mock.on('POST /api/auth/refresh', { error: 'NO_REFRESH_TOKEN' }, { status: 401 });

        await expect(api.get('/notes')).rejects.toBeDefined();

        expect(location.href).toBe('/login');
    });

    it('leaves a non-401 failure alone', async () => {
        let refreshes = 0;
        mock.server.use(
            http.post(`${ORIGIN}/api/auth/refresh`, () => {
                refreshes += 1;
                return HttpResponse.json({ accessToken: 'fresh' });
            }),
        );
        mock.on('GET /api/notes', { error: 'INTERNAL' }, { status: 500 });

        await expect(api.get('/notes')).rejects.toBeDefined();
        expect(refreshes).toBe(0);
    });
});

describe('error localisation', () => {
    it('replaces the wire code with a message, and keeps the code on `code`', async () => {
        mock.on('GET /api/notes', { error: 'NOTE_NOT_FOUND' }, { status: 404 });

        const err = await api.get('/notes').catch((caught: unknown) => caught);

        expect(apiErrorCode(err)).toBe('NOTE_NOT_FOUND');
        expect(apiErrorMessage(err, 'fallback')).toBe(i18n.global.t('errors.NOTE_NOT_FOUND'));
    });

    it('interpolates the params the API sent with the code', async () => {
        mock.on(
            'PUT /api/screeners/x/filters/made-up',
            { error: 'UNKNOWN_SCREENER_FILTER', params: { filter: 'made-up' } },
            { status: 422 },
        );

        const err = await api.put('/screeners/x/filters/made-up', {}).catch((caught: unknown) => caught);

        expect(apiErrorMessage(err, 'fallback')).toBe(
            i18n.global.t('errors.UNKNOWN_SCREENER_FILTER', { filter: 'made-up' }),
        );
    });

    it('never puts a raw SCREAMING_SNAKE code in front of a user', async () => {
        mock.on('GET /api/notes', { error: 'SOME_CODE_WITH_NO_TRANSLATION' }, { status: 400 });

        const err = await api.get('/notes').catch((caught: unknown) => caught);

        expect(apiErrorMessage(err, 'fallback')).toBe(i18n.global.t('errors.INTERNAL'));
        expect(apiErrorCode(err)).toBe('SOME_CODE_WITH_NO_TRANSLATION');
    });

    it('leaves a body with no error field alone', async () => {
        mock.on('GET /api/notes', { detail: 'something else' }, { status: 400 });

        const err = await api.get('/notes').catch((caught: unknown) => caught);

        expect(apiErrorCode(err)).toBeNull();
        expect(apiErrorMessage(err, 'fallback')).toBe('fallback');
    });

    it('falls back when the failure never reached the server', () => {
        expect(apiErrorMessage(new Error('offline'), 'fallback')).toBe('fallback');
        expect(apiErrorCode(new Error('offline'))).toBeNull();
    });
});
