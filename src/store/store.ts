import { defineStore } from 'pinia';
import i18n, { availableLocales } from '../i18n';

export const useUserStore = defineStore('user', {
    state: () => ({
        user: null as null | { username: string; Language?: string;[key: string]: any },
        theme: localStorage.getItem('user-theme') || 'default',
        language: localStorage.getItem('user-language') || 'en',
    }),
    actions: {
        setUser(user: { username: string; Language?: string;[key: string]: any }) {
            this.user = user;
            // If user has a language preference, apply it
            if (user.Language) {
                this.setLanguage(user.Language.toLowerCase());
            }
        },
        setTheme(theme: string) {
            this.theme = theme;
            localStorage.setItem('user-theme', theme);
        },
        setLanguage(language: string) {
            // Get available language codes from i18n config
            const validLanguages = availableLocales.map(locale => locale.code);
            const lang = validLanguages.includes(language.toLowerCase())
                ? language.toLowerCase()
                : 'en';

            this.language = lang;
            localStorage.setItem('user-language', lang);
            // Update i18n locale
            (i18n.global.locale as any).value = lang;
        },
        loadUserFromToken() {
            const token = localStorage.getItem('token');
            if (!token) {
                this.user = null;
                return;
            }
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            if (decodedToken.exp < Date.now() / 1000) {
                localStorage.removeItem('token');
                this.user = null;
                return;
            }
            this.user = decodedToken.user as { username: string; Language?: string;[key: string]: any };

            // Load user's language preference
            if (this.user?.Language) {
                this.setLanguage(this.user.Language);
            }
        },
    },
    getters: {
        getUser: (state): null | { username: string; Language?: string;[key: string]: any } => state.user,
        currentTheme: (state): string => state.theme,
        currentLanguage: (state): string => state.language,
        username: (state): string => state.user?.username ?? '',
    },
});