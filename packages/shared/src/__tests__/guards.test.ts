import { describe, expect, it } from 'vitest';

import { isList, isOneOf, isRecord } from '#guards.js';

describe('isRecord', () => {
    it('accepts a plain object, empty or not', () => {
        expect(isRecord({})).toBe(true);
        expect(isRecord({ open: 1 })).toBe(true);
    });

    it.each([
        ['null', null],
        ['an array', [1, 2]],
        ['a string', '{}'],
        ['a number', 1],
        ['undefined', undefined],
    ])('rejects %s', (_label, value) => {
        expect(isRecord(value)).toBe(false);
    });
});

describe('isList', () => {
    it('accepts an array, empty or not', () => {
        expect(isList([])).toBe(true);
        expect(isList([1, 'a'])).toBe(true);
    });

    it.each([
        ['an object', { length: 0 }],
        ['a string', 'abc'],
        ['null', null],
    ])('rejects %s', (_label, value) => {
        expect(isList(value)).toBe(false);
    });
});

describe('isOneOf', () => {
    const VERDICTS = ['bullish', 'bearish'] as const;

    it('accepts an entry of the list', () => {
        expect(isOneOf(VERDICTS, 'bullish')).toBe(true);
    });

    it.each([
        ['a value outside the list', 'neutral'],
        ['the wrong case', 'Bullish'],
        ['a non-string', 1],
        ['null', null],
    ])('rejects %s', (_label, value) => {
        expect(isOneOf(VERDICTS, value)).toBe(false);
    });
});
