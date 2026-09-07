import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpResponse, http } from 'msw';
import { mockApi, ORIGIN } from '@/__tests__/support/msw';
import { clearAuth, setSessionUser } from '@/api/client';
import { initTheme, useTheme } from '@/composables/ui/useTheme';
import { DEFAULT_THEME } from '@/composables/ui/themes';

const mock = mockApi();
const { currentTheme, applyTheme, syncTheme, themes } = useTheme();

const user = {
    id: '507f1f77bcf86cd799439011',
    username: 'larry',
    language: 'en',
    twoFactorEnabled: false,
    passwordResetRequired: false,
};

const preferences = (theme: string | null): Record<string, unknown> => ({
    language: 'en',
    theme,
    defaultSymbol: 'AAPL',
    hiddenSymbols: [],
    chartSettings: null,
    panels: null,
    screenerColumns: [],
});

const painted = (): string | null => document.documentElement.getAttribute('data-theme');

beforeEach(() => {
    clearAuth();
    localStorage.clear();
    applyTheme(DEFAULT_THEME);
});

describe('initTheme', () => {
    it('paints the stored theme, so the first frame is the right colour', () => {
        localStorage.setItem('ereuna-theme', 'gruvbox');

        initTheme();

        expect(painted()).toBe('gruvbox');
        expect(currentTheme.value).toBe('gruvbox');
    });

    it('falls back to the default when nothing is stored', () => {
        initTheme();

        expect(currentTheme.value).toBe(DEFAULT_THEME);
    });

    it('ignores a stored theme the stylesheet no longer defines', () => {
        localStorage.setItem('ereuna-theme', 'tokyo-night');

        initTheme();

        expect(currentTheme.value).toBe(DEFAULT_THEME);
    });
});

describe('applyTheme', () => {
    it('switches with one attribute write, and remembers the choice', () => {
        applyTheme('catpuccin');

        expect(painted()).toBe('catpuccin');
        expect(localStorage.getItem('ereuna-theme')).toBe('catpuccin');
    });

    it('does not call the account when nobody is signed in', () => {
        applyTheme('catpuccin');

        expect(mock.calls).toHaveLength(0);
    });

    it('tells the account in the background once there is a session', async () => {
        setSessionUser(user);
        mock.on('PATCH /api/preferences', preferences('catpuccin'));

        applyTheme('catpuccin');

        await vi.waitFor(() => expect(mock.calls).toHaveLength(1));
        expect(mock.last().body).toEqual({ theme: 'catpuccin' });
    });

    it('keeps the applied theme when the account write fails', async () => {
        setSessionUser(user);
        mock.on('PATCH /api/preferences', { error: 'INTERNAL' }, { status: 500 });

        applyTheme('catpuccin');
        await vi.waitFor(() => expect(mock.calls).toHaveLength(1));

        expect(currentTheme.value).toBe('catpuccin');
    });

    it('offers the whole manifest to a picker — three dark and three light', () => {
        expect(themes.map((theme) => theme.id)).toHaveLength(6);
    });
});

describe('syncTheme', () => {
    it('does nothing without a session', async () => {
        await syncTheme();

        expect(mock.calls).toHaveLength(0);
    });

    it('adopts the account theme, so a choice follows the user to another device', async () => {
        setSessionUser(user);
        mock.on('GET /api/preferences', preferences('gruvbox'));

        await syncTheme();

        expect(currentTheme.value).toBe('gruvbox');
        expect(localStorage.getItem('ereuna-theme')).toBe('gruvbox');
    });

    it('leaves the local theme alone when the account has none', async () => {
        setSessionUser(user);
        applyTheme('catpuccin');
        mock.on('GET /api/preferences', preferences(null));

        await syncTheme();

        expect(currentTheme.value).toBe('catpuccin');
    });

    it('leaves the local theme alone when the account cannot be read', async () => {
        setSessionUser(user);
        applyTheme('catpuccin');
        mock.server.use(http.get(`${ORIGIN}/api/preferences`, () => HttpResponse.error()));

        await expect(syncTheme()).resolves.toBeUndefined();

        expect(currentTheme.value).toBe('catpuccin');
    });
});
