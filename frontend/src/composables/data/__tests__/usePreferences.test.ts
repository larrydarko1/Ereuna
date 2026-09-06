import { beforeEach, describe, expect, it } from 'vitest';
import { HttpResponse, http } from 'msw';
import { mockApi, ORIGIN } from '@/__tests__/support/msw';
import { clearAuth } from '@/api/client';
import { loadPreferences, patchPreferences, usePreferences } from '@/composables/data/usePreferences';

const mock = mockApi();
const { preferences } = usePreferences();

const stored = {
    language: 'en',
    theme: 'nord',
    defaultSymbol: 'AAPL',
    hiddenSymbols: [],
    chartSettings: null,
    panels: null,
    screenerColumns: [],
};

beforeEach(() => {
    // The cache is module state and is cleared with the session, which is also
    // how each test gets an empty one.
    clearAuth();
});

describe('loadPreferences', () => {
    it('reads them once and answers from the cache after that', async () => {
        let reads = 0;
        mock.server.use(
            http.get(`${ORIGIN}/api/preferences`, () => {
                reads += 1;
                return HttpResponse.json(stored);
            }),
        );

        await expect(loadPreferences()).resolves.toEqual(stored);
        await loadPreferences();

        expect(reads).toBe(1);
        expect(preferences.value).toEqual(stored);
    });

    it('shares one request between concurrent callers', async () => {
        let reads = 0;
        mock.server.use(
            http.get(`${ORIGIN}/api/preferences`, () => {
                reads += 1;
                return HttpResponse.json(stored);
            }),
        );

        await Promise.all([loadPreferences(), loadPreferences(), loadPreferences()]);

        expect(reads).toBe(1);
    });

    it('re-reads when forced', async () => {
        mock.on('GET /api/preferences', stored);
        await loadPreferences();
        mock.on('GET /api/preferences', { ...stored, theme: 'dracula' });

        await expect(loadPreferences(true)).resolves.toMatchObject({ theme: 'dracula' });
    });

    it('does not cache a failure — the next caller tries again', async () => {
        // Registered fallback first: `server.use` prepends, so the one-shot
        // failure below is what the first read meets.
        mock.on('GET /api/preferences', stored);
        mock.on('GET /api/preferences', { error: 'INTERNAL' }, { status: 500, once: true });

        await expect(loadPreferences()).rejects.toBeDefined();

        await expect(loadPreferences()).resolves.toEqual(stored);
    });
});

describe('patchPreferences', () => {
    it('applies the change locally before the round trip', async () => {
        mock.on('GET /api/preferences', stored);
        await loadPreferences();
        mock.server.use(
            http.patch(`${ORIGIN}/api/preferences`, async () => {
                // Read at the moment the request is in flight: the optimistic
                // value is what a component is rendering right now.
                expect(preferences.value?.theme).toBe('dracula');
                return HttpResponse.json({ ...stored, theme: 'dracula' });
            }),
        );

        await patchPreferences({ theme: 'dracula' });

        expect(preferences.value?.theme).toBe('dracula');
    });

    it("takes the server's answer as the settled value", async () => {
        mock.on('GET /api/preferences', stored);
        await loadPreferences();
        mock.on('PATCH /api/preferences', { ...stored, theme: 'nord', defaultSymbol: 'MSFT' });

        await patchPreferences({ theme: 'dracula' });

        expect(preferences.value).toMatchObject({ theme: 'nord', defaultSymbol: 'MSFT' });
    });

    it('puts the previous value back when the write is refused', async () => {
        mock.on('GET /api/preferences', stored);
        await loadPreferences();
        mock.on('PATCH /api/preferences', { error: 'VALIDATION_FAILED' }, { status: 422 });

        await expect(patchPreferences({ theme: 'dracula' })).rejects.toBeDefined();

        expect(preferences.value).toEqual(stored);
    });

    it('writes even when nothing has been read yet', async () => {
        mock.on('PATCH /api/preferences', stored);

        await patchPreferences({ theme: 'nord' });

        expect(preferences.value).toEqual(stored);
    });
});

describe('the session ending', () => {
    it('drops the cache, so the next user does not inherit it', async () => {
        mock.on('GET /api/preferences', stored);
        await loadPreferences();

        clearAuth();

        expect(preferences.value).toBeNull();
    });
});
