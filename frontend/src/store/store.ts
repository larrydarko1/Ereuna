/**
 * MIGRATION SCAFFOLDING — delete when the last view below is migrated.
 * The frontend is being rebuilt one domain at a time, and a dozen views still
 * read the session, theme and language through this store. It now sits on the
 * new foundation (api/client, useTheme, i18n) instead of decoding a JWT out of
 * localStorage, so those views keep working while their batch is pending.
 * Nothing new should import this. The replacements are:
 *   user       → findSessionUser() / isAuthenticated() from @/api/client
 *   theme      → useTheme() from @/composables/ui/useTheme
 *   language   → changeLocale() from @/i18n
 * Remaining consumers: charts/panel, charts/panel2, sidebar/summary,
 * User/Themes, User/AccountSettings, and the Charts, Screener, Portfolio and
 * User views. App.vue, NotificationPopup and Login dropped it in batch 2.
 */
import { defineStore } from 'pinia';
import { findSessionUser, type SessionUser } from '@/api/client';
import { useTheme } from '@/composables/ui/useTheme';
import { isThemeId, DEFAULT_THEME } from '@/composables/ui/themes';
import { changeLocale, isSupportedLocale, i18n } from '@/i18n';

export const useUserStore = defineStore('user', {
    state: () => ({
        user: findSessionUser(),
    }),
    actions: {
        /** Re-read the session hint. The access token itself lives in memory in
         *  api/client and is never decoded here. */
        loadUserFromToken(): void {
            this.user = findSessionUser();
        },
        setTheme(theme: string): void {
            useTheme().applyTheme(isThemeId(theme) ? theme : DEFAULT_THEME);
        },
        setLanguage(language: string): void {
            if (isSupportedLocale(language)) void changeLocale(language);
        },
    },
    getters: {
        getUser: (state): SessionUser | null => state.user,
        username: (state): string => state.user?.username ?? '',
        currentTheme: (): string => useTheme().currentTheme.value,
        currentLanguage: (): string => i18n.global.locale.value,
    },
});
