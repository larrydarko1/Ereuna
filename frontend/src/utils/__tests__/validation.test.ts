import { beforeEach, describe, expect, it } from 'vitest';
import { i18n } from '@/i18n';
import { allValid, validatePassword, validatePasswordConfirmation, validateUsername } from '@/utils/validation';

const message = (key: string, params?: Record<string, number>): string => i18n.global.t(key, params ?? {});

beforeEach(() => {
    i18n.global.locale.value = 'en';
});

describe('validateUsername', () => {
    it('accepts a name inside the rules', () => {
        expect(validateUsername('larry_99')).toBeNull();
    });

    it('trims before it measures', () => {
        expect(validateUsername('  larry  ')).toBeNull();
    });

    it('requires a name', () => {
        expect(validateUsername('   ')).toBe(message('validation.usernameRequired'));
    });

    it('holds the length to three through thirty', () => {
        const expected = message('validation.usernameLength', { min: 3, max: 30 });

        expect(validateUsername('ab')).toBe(expected);
        expect(validateUsername('x'.repeat(31))).toBe(expected);
    });

    it('refuses anything but letters, numbers and underscores', () => {
        expect(validateUsername('larry darko')).toBe(message('validation.usernameCharacters'));
        expect(validateUsername('larry-darko')).toBe(message('validation.usernameCharacters'));
    });

    it('answers in the active language', () => {
        i18n.global.locale.value = 'fr';

        expect(validateUsername('')).toBe(message('validation.usernameRequired'));
    });
});

describe('validatePassword', () => {
    it('accepts one that meets every rule', () => {
        expect(validatePassword('Str0ng!pass')).toBeNull();
    });

    it('does not trim — a space the user chose is a character of the password', () => {
        expect(validatePassword(' Str0ng!pass ')).toBeNull();
    });

    it('requires a password', () => {
        expect(validatePassword('')).toBe(message('validation.passwordRequired'));
    });

    it('holds the length to eight through a hundred and twenty-eight', () => {
        const expected = message('validation.passwordLength', { min: 8, max: 128 });

        expect(validatePassword('Sh0rt!')).toBe(expected);
        expect(validatePassword(`${'A1!a'.repeat(32)}x`)).toBe(expected);
    });

    it.each([
        ['an uppercase letter', 'str0ng!pass', 'validation.passwordUppercase'],
        ['a lowercase letter', 'STR0NG!PASS', 'validation.passwordLowercase'],
        ['a number', 'Strong!pass', 'validation.passwordNumber'],
        ['a special character', 'Str0ngpass1', 'validation.passwordSpecial'],
    ])('reports a password with no %s', (_case, value, key) => {
        expect(validatePassword(value)).toBe(message(key));
    });
});

describe('validatePasswordConfirmation', () => {
    it('accepts a matching confirmation', () => {
        expect(validatePasswordConfirmation('Str0ng!pass', 'Str0ng!pass')).toBeNull();
    });

    it('requires one', () => {
        expect(validatePasswordConfirmation('Str0ng!pass', '')).toBe(message('validation.confirmationRequired'));
    });

    it('reports a mismatch', () => {
        expect(validatePasswordConfirmation('Str0ng!pass', 'Str0ng!pas')).toBe(message('validation.passwordMismatch'));
    });
});

describe('allValid', () => {
    it('is true only when every result is null', () => {
        expect(allValid([null, null])).toBe(true);
        expect(allValid([])).toBe(true);
        expect(allValid([null, 'nope'])).toBe(false);
    });
});
