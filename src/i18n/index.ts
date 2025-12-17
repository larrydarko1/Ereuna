import { createI18n } from 'vue-i18n';
import en from './locales/en';
import zh from './locales/zh';
import es from './locales/es';
import ar from './locales/ar';
import fr from './locales/fr';
import pt from './locales/pt';
import ru from './locales/ru';
import de from './locales/de';
import jp from './locales/jp';
import ko from './locales/ko';
import it from './locales/it';
import gr from './locales/gr';
import he from './locales/he';
import mt from './locales/mt';
import la from './locales/la';
import ep from './locales/ep';

// Get the user's preferred language from localStorage or default to English
const getDefaultLocale = (): string => {
    // First check if user has a saved preference
    const savedLocale = localStorage.getItem('user-language');
    if (savedLocale && ['en', 'zh', 'es', 'ar', 'fr', 'pt', 'ru', 'de', 'jp', 'ko', 'it', 'gr', 'he', 'mt', 'la', 'ep'].includes(savedLocale)) {
        return savedLocale;
    }

    // Otherwise try to detect from browser
    const browserLocale = navigator.language.toLowerCase();
    if (browserLocale.startsWith('zh')) {
        return 'zh';
    } else if (browserLocale.startsWith('es')) {
        return 'es';
    } else if (browserLocale.startsWith('ar')) {
        return 'ar';
    } else if (browserLocale.startsWith('fr')) {
        return 'fr';
    } else if (browserLocale.startsWith('pt')) {
        return 'pt';
    } else if (browserLocale.startsWith('ru')) {
        return 'ru';
    } else if (browserLocale.startsWith('de')) {
        return 'de';
    } else if (browserLocale.startsWith('ja')) {
        return 'jp';
    } else if (browserLocale.startsWith('ko')) {
        return 'ko';
    } else if (browserLocale.startsWith('it')) {
        return 'it';
    } else if (browserLocale.startsWith('el')) {
        return 'gr';
    } else if (browserLocale.startsWith('he') || browserLocale.startsWith('iw')) {
        return 'he';
    } else if (browserLocale.startsWith('mt')) {
        return 'mt';
    } else if (browserLocale.startsWith('la')) {
        return 'la';
    } else if (browserLocale.startsWith('eo')) {
        return 'ep';
    }

    return 'en'; // Default to English
};

// Type-safe translation messages
export type MessageSchema = typeof en;

const i18n = createI18n<[MessageSchema], 'en' | 'zh' | 'es' | 'ar' | 'fr' | 'pt' | 'ru' | 'de' | 'jp' | 'ko' | 'it' | 'gr' | 'he' | 'mt' | 'la' | 'ep'>({
    legacy: false, // Use Composition API mode
    locale: getDefaultLocale(),
    fallbackLocale: 'en',
    messages: {
        en,
        zh,
        es,
        ar,
        fr,
        pt,
        ru,
        de,
        jp,
        ko,
        it,
        gr,
        he,
        mt,
        la,
        ep,
    },
    globalInjection: true, // Enable global $t
});

export default i18n;

// Export the available locales
export const availableLocales = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'jp', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'gr', name: 'Greek', nativeName: 'Ελληνικά' },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
    { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
    { code: 'la', name: 'Latin', nativeName: 'Latina' },
    { code: 'ep', name: 'Esperanto', nativeName: 'Esperanto' },
];
