import { createI18n } from 'vue-i18n';
import en from './locales/en';
import es from './locales/es';

// Get the user's preferred language from localStorage or default to English
const getDefaultLocale = (): string => {
    // First check if user has a saved preference
    const savedLocale = localStorage.getItem('user-language');
    if (savedLocale && ['en', 'es'].includes(savedLocale)) {
        return savedLocale;
    }

    // Otherwise try to detect from browser
    const browserLocale = navigator.language.toLowerCase();
    if (browserLocale.startsWith('es')) {
        return 'es';
    }

    return 'en'; // Default to English
};

// Type-safe translation messages
export type MessageSchema = typeof en;

const i18n = createI18n<[MessageSchema], 'en' | 'es'>({
    legacy: false, // Use Composition API mode
    locale: getDefaultLocale(),
    fallbackLocale: 'en',
    messages: {
        en,
        es,
    },
    globalInjection: true, // Enable global $t
});

export default i18n;

// Export the available locales
export const availableLocales = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
];
