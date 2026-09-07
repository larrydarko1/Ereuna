/**
 * useTheme — the app's six palettes, switched at runtime.
 * Switching is one attribute write: `data-theme` on <html> activates the
 * matching block in `styles/_themes.scss`, and every component that reads a
 * $color-* token follows automatically. No component does any work per switch.
 * Persistence is two-layer, and the order matters:
 *   • localStorage is applied synchronously at boot, before the first paint,
 *     so the app never flashes the default theme on the way to the right one.
 *   • the account is authoritative and is reconciled once the session resolves,
 *     which is what makes a theme follow a user to another device.
 * `initTheme` is deliberately split from `syncTheme`: the first must run before
 * paint and cannot await anything; the second needs a session and can.
 * The account read goes through the shared preferences cache rather than a
 * direct GET, so the theme sync and the chart view's first load are one request.
 */
import { readonly, ref, type Ref } from 'vue';
import { isAuthenticated } from '@/api/client';
import { loadPreferences, patchPreferences } from '@/composables/data/usePreferences';
import { DEFAULT_THEME, isThemeId, THEMES, type ThemeId } from '@/composables/ui/themes';

export type UseThemeReturn = {
    currentTheme: Readonly<Ref<ThemeId>>;
    themes: typeof THEMES;
    applyTheme: (id: ThemeId) => void;
    syncTheme: () => Promise<void>;
};

const STORAGE_KEY = 'ereuna-theme';

// Module scope, not per-call: every component that calls useTheme() observes
// the same theme, which is the whole point of a single <html> attribute.
const currentTheme = ref<ThemeId>(DEFAULT_THEME);

/**
 * Paint the stored theme. Called from main.ts before the app mounts, so it
 * must stay synchronous — anything awaited here is a frame of the wrong colour.
 */
export function initTheme(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    setTheme(isThemeId(stored) ? stored : DEFAULT_THEME);
}

export function useTheme(): UseThemeReturn {
    /** Switch theme, remember it locally, and tell the account in the background. */
    function applyTheme(id: ThemeId): void {
        setTheme(id);
        localStorage.setItem(STORAGE_KEY, id);
        if (!isAuthenticated()) return;
        patchPreferences({ theme: id }).catch(() => {
            // Fire and forget: the theme is already applied and stored locally,
            // and the next successful read reconciles it.
        });
    }

    /**
     * Adopt the account's theme once a session exists.
     * The local choice wins until this resolves, so a signed-in user on a new
     * device sees the default briefly rather than nothing at all.
     */
    async function syncTheme(): Promise<void> {
        if (!isAuthenticated()) return;
        try {
            const { theme } = await loadPreferences();
            if (isThemeId(theme) && theme !== currentTheme.value) {
                setTheme(theme);
                localStorage.setItem(STORAGE_KEY, theme);
            }
        } catch {
            // Offline or unauthorised — the local theme already applies.
        }
    }

    return { currentTheme: readonly(currentTheme), themes: THEMES, applyTheme, syncTheme };
}

function setTheme(id: ThemeId): void {
    document.documentElement.setAttribute('data-theme', id);
    currentTheme.value = id;
}
