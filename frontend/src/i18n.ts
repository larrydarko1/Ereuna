/**
 * i18n — application internationalisation.
 * Locale-driven: to add a language, drop a `<code>.json` into `@/locales`,
 * import it below, and add one entry to `SUPPORTED_LOCALES`. Nothing else
 * changes. Codes are ISO 639-1, so browser detection is a plain prefix match
 * rather than a table of special cases.
 * Persistence model:
 *   The preference lives on the account (`GET/PATCH /api/preferences`) and is
 *   mirrored into localStorage. The access token carries only `sub`, by design,
 *   so the locale cannot travel in a claim the way a session hint could:
 *     • localStorage → applied synchronously at boot, so the first paint is
 *       already in the right language and script direction.
 *     • the account  → authoritative, reconciled once the session resolves.
 * The `errors.*` namespace is the other half of the API's error contract: the
 * server sends a stable code and never English, and every code in
 * `@ereuna/shared`'s ERROR_CODES has an entry here in every locale.
 */
import { createI18n } from 'vue-i18n';
import ar from '@/locales/ar.json';
import de from '@/locales/de.json';
import el from '@/locales/el.json';
import en from '@/locales/en.json';
import eo from '@/locales/eo.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import he from '@/locales/he.json';
import hi from '@/locales/hi.json';
import it from '@/locales/it.json';
import ja from '@/locales/ja.json';
import ko from '@/locales/ko.json';
import la from '@/locales/la.json';
import mt from '@/locales/mt.json';
import pt from '@/locales/pt.json';
import ru from '@/locales/ru.json';
import tr from '@/locales/tr.json';
import zh from '@/locales/zh.json';

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]['code'];

/** English is the reference shape: every other locale must match it key for key. */
export type MessageSchema = typeof en;

export type LocaleMeta = {
    code: string;
    /** The language's name in that language — what a picker should show. */
    label: string;
    /** Right-to-left scripts need `dir` on <html>, not just `lang`. */
    rtl?: true;
};

export const SUPPORTED_LOCALES = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية', rtl: true },
    { code: 'pt', label: 'Português' },
    { code: 'ru', label: 'Русский' },
    { code: 'de', label: 'Deutsch' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'it', label: 'Italiano' },
    { code: 'el', label: 'Ελληνικά' },
    { code: 'he', label: 'עברית', rtl: true },
    { code: 'eo', label: 'Esperanto' },
    { code: 'mt', label: 'Malti' },
    { code: 'la', label: 'Latina' },
] as const satisfies readonly LocaleMeta[];

const DEFAULT_LOCALE = 'en';

const STORAGE_KEY = 'ereuna-locale';

// Schema, locale set and legacy-mode are all stated as generics. Left to
// inference with 18 message objects vue-i18n falls through to its legacy
// overload, and the `legacy: false` property alone does not narrow the return
// type — `global.locale` stops being a ref and every `locale.value` read in
// the app breaks. The third generic is what actually settles it.
export const i18n = createI18n<[MessageSchema], AppLocale, false>({
    legacy: false,
    locale: DEFAULT_LOCALE,
    fallbackLocale: DEFAULT_LOCALE,
    escapeParameter: true,
    messages: { ar, de, el, en, eo, es, fr, he, hi, it, ja, ko, la, mt, pt, ru, tr, zh },
});

export function isSupportedLocale(code: unknown): code is AppLocale {
    return typeof code === 'string' && SUPPORTED_LOCALES.some((locale) => locale.code === code);
}

/** The locale to paint with before the session has resolved. */
export function initLocale(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isSupportedLocale(stored)) {
        setAppLocale(stored);
        return;
    }
    const browser = navigator.language.slice(0, 2);
    setAppLocale(isSupportedLocale(browser) ? browser : DEFAULT_LOCALE);
}

/** Adopt the locale the account is stored with, without writing it back. */
export function adoptLocale(locale: string): void {
    if (!isSupportedLocale(locale)) return;
    localStorage.setItem(STORAGE_KEY, locale);
    setAppLocale(locale);
}

export async function changeLocale(locale: AppLocale): Promise<void> {
    adoptLocale(locale);
    const { updatePreferences } = await import('@/api/preferences');
    try {
        await updatePreferences({ language: locale });
    } catch {
        // Non-critical: the local choice already applies, and the next read of
        // the account reconciles it.
    }
}

/**
 * Apply a locale to the running app and to the document.
 * `lang` drives screen-reader pronunciation and `dir` drives the whole layout
 * mirror, so both belong here rather than at the call sites.
 */
function setAppLocale(locale: AppLocale): void {
    i18n.global.locale.value = locale;
    const meta = SUPPORTED_LOCALES.find((entry) => entry.code === locale);
    const root = document.documentElement;
    root.setAttribute('lang', locale);
    root.setAttribute('dir', meta !== undefined && 'rtl' in meta ? 'rtl' : 'ltr');
}
