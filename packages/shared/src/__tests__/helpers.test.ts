import { describe, expect, it } from 'vitest';
import { hasValue, isFiniteNumber } from '#helpers.js';

describe('hasValue', () => {
    it.each([
        ['a non-empty string', 'AAPL', true],
        ['a string of spaces', '   ', true],
        ['the empty string', '', false],
        ['null', null, false],
        ['undefined', undefined, false],
        ['a number', 0, false],
        ['a String object', new String('AAPL'), false],
    ])('is %s → %s', (_label, value, expected) => {
        expect(hasValue(value)).toBe(expected);
    });
});

describe('isFiniteNumber', () => {
    it.each([
        ['zero', 0, true],
        ['a negative', -12.5, true],
        ['NaN', Number.NaN, false],
        ['Infinity', Number.POSITIVE_INFINITY, false],
        ['-Infinity', Number.NEGATIVE_INFINITY, false],
        ['a numeric string', '42', false],
        ['null', null, false],
        ['a bigint', 42n, false],
    ])('is %s → %s', (_label, value, expected) => {
        expect(isFiniteNumber(value)).toBe(expected);
    });
});
