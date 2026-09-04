/**
 * Client-side validation — the same rules the API enforces, checked early so a
 * user is told before a round trip rather than after one.
 * This is a courtesy, never a control: every rule here is enforced again
 * server-side, because anything checked only in the browser is not checked.
 * Each function returns a ready message or null, and the limits are
 * interpolated here rather than baked into 18 translation files, so changing a
 * constant changes every language at once.
 * The username and password rules mirror `usernameSchema` and `passwordSchema`
 * in api/src/lib/schemas.ts exactly. If they drift, this file is the one that
 * is wrong — the server is the authority, and a client rule that is stricter
 * than the server's only rejects passwords the server would have accepted.
 */
import { i18n } from '@/i18n';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

export function validateUsername(value: string): string | null {
    const trimmed = value.trim();
    if (trimmed === '') return t('validation.usernameRequired');
    if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX) {
        return t('validation.usernameLength', { min: USERNAME_MIN, max: USERNAME_MAX });
    }
    if (!USERNAME_PATTERN.test(trimmed)) return t('validation.usernameCharacters');
    return null;
}

/**
 * Passwords are not trimmed, here or on the server. A leading or trailing space
 * is a character the user chose, and silently removing it means the password
 * that was accepted at registration is not the one that is checked at login.
 */
export function validatePassword(value: string): string | null {
    if (value === '') return t('validation.passwordRequired');
    if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
        return t('validation.passwordLength', { min: PASSWORD_MIN, max: PASSWORD_MAX });
    }
    if (!/[A-Z]/.test(value)) return t('validation.passwordUppercase');
    if (!/[a-z]/.test(value)) return t('validation.passwordLowercase');
    if (!/[0-9]/.test(value)) return t('validation.passwordNumber');
    if (!/[^A-Za-z0-9]/.test(value)) return t('validation.passwordSpecial');
    return null;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
    if (confirmation === '') return t('validation.confirmationRequired');
    if (password !== confirmation) return t('validation.passwordMismatch');
    return null;
}

/** True when every check passed. */
export function allValid(results: readonly (string | null)[]): boolean {
    return results.every((result) => result === null);
}

function t(key: string, params?: Record<string, number>): string {
    return i18n.global.t(key, params ?? {});
}
