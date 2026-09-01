/**
 * Client-side validation — the same rules the API enforces, checked early so a
 * user is told before a round trip rather than after one.
 * This is a courtesy, never a control: every rule here is enforced again
 * server-side, because anything checked only in the browser is not checked.
 * Each function returns a ready message or null, and the limits are
 * interpolated here rather than baked into 18 translation files, so changing a
 * constant changes every language at once.
 */
import { i18n } from '@/i18n';

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const SYMBOL_PATTERN = /^[A-Z0-9.\-^]+$/;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const PASSWORD_MIN = 12;

export function validateUsername(value: string): string | null {
    const trimmed = value.trim();
    if (trimmed === '') return t('usernameRequired');
    if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX) {
        return t('usernameLength', { min: USERNAME_MIN, max: USERNAME_MAX });
    }
    if (!USERNAME_PATTERN.test(trimmed)) return t('usernameCharacters');
    return null;
}

export function validatePassword(value: string): string | null {
    if (value === '') return t('passwordRequired');
    if (value.length < PASSWORD_MIN) return t('passwordLength', { min: PASSWORD_MIN });
    return null;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
    if (confirmation === '') return t('confirmationRequired');
    if (password !== confirmation) return t('passwordMismatch');
    return null;
}

export function validateSymbol(value: string): string | null {
    const trimmed = value.trim().toUpperCase();
    if (trimmed === '') return t('symbolRequired');
    if (!SYMBOL_PATTERN.test(trimmed)) return t('symbolInvalid');
    return null;
}

/** A quantity that must be a real, positive, finite number. */
export function validatePositiveNumber(value: number | null | undefined): string | null {
    if (value == null || Number.isNaN(value)) return t('numberRequired');
    if (!Number.isFinite(value)) return t('numberInvalid');
    if (value <= 0) return t('numberPositive');
    return null;
}

/** A figure that may be zero but not negative — a commission, for instance. */
export function validateNonNegativeNumber(value: number | null | undefined): string | null {
    if (value == null || Number.isNaN(value)) return t('numberRequired');
    if (!Number.isFinite(value)) return t('numberInvalid');
    if (value < 0) return t('numberNonNegative');
    return null;
}

/** True when every check passed. */
export function allValid(results: readonly (string | null)[]): boolean {
    return results.every((result) => result === null);
}

function t(key: string, params?: Record<string, number>): string {
    return i18n.global.t(`validation.${key}`, params ?? {});
}
