import { describe, expect, it } from 'vitest';
import { ERROR_CODES, isErrorCode } from '#errors.js';

describe('ERROR_CODES', () => {
    it('has no duplicate codes', () => {
        expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
    });

    it('is SCREAMING_SNAKE throughout — the frontend keys `errors.*` off these verbatim', () => {
        for (const code of ERROR_CODES) expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
    });
});

describe('isErrorCode', () => {
    it('accepts every declared code', () => {
        for (const code of ERROR_CODES) expect(isErrorCode(code)).toBe(true);
    });

    it.each([
        ['an unknown code', 'NOT_A_REAL_CODE'],
        ['the wrong case', 'not_found'],
        ['the empty string', ''],
        ['null', null],
        ['a number', 404],
        ['an object', { code: 'NOT_FOUND' }],
    ])('rejects %s', (_label, value) => {
        expect(isErrorCode(value)).toBe(false);
    });
});
