import { describe, expect, it } from 'vitest';

import { LIMITS } from '#limits.js';
import {
    makePaginationQuery,
    passwordSchema,
    portfolioNumberField,
    requiredString,
    resourceNameField,
    searchField,
    symbolField,
    usernameField,
} from '#requests/fields.js';

describe('passwordSchema', () => {
    it('accepts a password meeting every rule', () => {
        expect(passwordSchema.safeParse('Str0ng!pass').success).toBe(true);
    });

    it.each([
        ['too short', 'Ab1!efg'],
        ['no uppercase', 'str0ng!pass'],
        ['no lowercase', 'STR0NG!PASS'],
        ['no digit', 'Strong!pass'],
        ['no special character', 'Str0ngpass'],
        ['too long', `Aa1!${'x'.repeat(130)}`],
    ])('rejects one with %s', (_label, value) => {
        expect(passwordSchema.safeParse(value).success).toBe(false);
    });

    it('reports every rule a password broke, not just the first', () => {
        const result = passwordSchema.safeParse('abc');
        expect(result.success).toBe(false);
        expect(result.error?.issues.length).toBeGreaterThan(1);
    });
});

describe('usernameField', () => {
    it('trims and accepts letters, numbers and underscores', () => {
        expect(usernameField.parse('  larry_1  ')).toBe('larry_1');
    });

    it.each([
        ['too short', 'ab'],
        ['too long', 'a'.repeat(31)],
        ['a space inside', 'lar ry'],
        ['a hyphen', 'lar-ry'],
        ['a dollar sign, which is also a Mongo operator prefix', '$where'],
        ['empty', ''],
    ])('rejects a username that is %s', (_label, value) => {
        expect(usernameField.safeParse(value).success).toBe(false);
    });
});

describe('symbolField', () => {
    it('upper-cases, so a lower-case request hits the same cache key', () => {
        expect(symbolField.parse('aapl')).toBe('AAPL');
    });

    it('allows the punctuation real tickers carry', () => {
        expect(symbolField.parse('brk.b')).toBe('BRK.B');
        expect(symbolField.parse('^gspc')).toBe('^GSPC');
        expect(symbolField.parse('rds-a')).toBe('RDS-A');
    });

    it.each([
        ['empty', ''],
        ['longer than twenty characters', 'A'.repeat(21)],
        ['carrying a slash', 'A/B'],
        ['carrying a Mongo operator', '$ne'],
        ['carrying a regex metacharacter', 'A.*'],
        ['carrying a space', 'A B'],
    ])('rejects a symbol %s — these reach queries and cache keys', (_label, value) => {
        expect(symbolField.safeParse(value).success).toBe(false);
    });
});

describe('resourceNameField', () => {
    it('trims and accepts an ordinary name', () => {
        expect(resourceNameField.parse('  Growth  ')).toBe('Growth');
    });

    it.each([
        ['whitespace only', '   '],
        ['longer than sixty characters', 'x'.repeat(61)],
    ])('rejects a name that is %s', (_label, value) => {
        expect(resourceNameField.safeParse(value).success).toBe(false);
    });
});

describe('portfolioNumberField', () => {
    it('reads the string a path parameter always is', () => {
        expect(portfolioNumberField.parse('3')).toBe(3);
    });

    it('takes its ceiling from the shared limits rather than from the caller', () => {
        expect(portfolioNumberField.safeParse(String(LIMITS.portfolioSlots - 1)).success).toBe(true);
        expect(portfolioNumberField.safeParse(String(LIMITS.portfolioSlots)).success).toBe(false);
    });

    it.each([
        ['negative', '-1'],
        ['fractional', '1.5'],
        ['not a number', 'first'],
        // A coerced number reads both as 0, the first slot
        ['a space', ' '],
        ['empty', ''],
        ['in exponent form', '1e0'],
        ['zero-padded', '01'],
    ])('rejects a slot that is %s', (_label, value) => {
        expect(portfolioNumberField.safeParse(value).success).toBe(false);
    });
});

describe('makePaginationQuery', () => {
    it('defaults to the first page at the given size', () => {
        expect(makePaginationQuery().parse({})).toEqual({ page: 1, limit: 24 });
    });

    it('takes a caller-supplied default and maximum', () => {
        const schema = makePaginationQuery({ defaultLimit: 10, maxLimit: 50 });
        expect(schema.parse({}).limit).toBe(10);
        expect(schema.safeParse({ limit: '50' }).success).toBe(true);
        expect(schema.safeParse({ limit: '51' }).success).toBe(false);
    });

    it('reads the strings a query string always is', () => {
        expect(makePaginationQuery().parse({ page: '2', limit: '5' })).toEqual({ page: 2, limit: 5 });
    });

    it.each([
        ['page zero', { page: '0' }],
        ['a negative page', { page: '-1' }],
        ['a fractional page', { page: '1.5' }],
        ['limit zero', { limit: '0' }],
        ['a blank page', { page: '' }],
        ['a padded page', { page: ' 2' }],
        // Each is a number to `Number()`, which is what coercion ran
        ['an exponent', { page: '1e1' }],
        ['a decimal point', { page: '1.0' }],
        ['a hex literal', { page: '0x10' }],
        ['a leading zero', { page: '02' }],
        ['a page past the safe integers', { page: '9007199254740993' }],
    ])('rejects %s', (_label, query) => {
        expect(makePaginationQuery().safeParse(query).success).toBe(false);
    });
});

describe('requiredString', () => {
    it("rejects an absent and an empty value with the caller's message", () => {
        const schema = requiredString('Ticker is required');
        expect(schema.safeParse('AAPL').success).toBe(true);
        expect(schema.safeParse('').error?.issues[0]?.message).toBe('Ticker is required');
        expect(schema.safeParse(undefined).error?.issues[0]?.message).toBe('Ticker is required');
    });
});

describe('searchField', () => {
    const field = searchField(60);

    it('takes a term with spaces inside it', () => {
        expect(field.parse('apple inc')).toBe('apple inc');
    });

    it.each([
        ['empty', ''],
        ['whitespace only', '   '],
        // The search box trims before it sends, so the API holds one rule with the document
        ['padded', ' apple'],
        ['ending on a vertical tab', 'apple\v'],
        ['longer than its maximum', 'x'.repeat(61)],
        // A regex reaches MongoDB as a C string, which cannot hold one: it would fail the query as a 500
        ['carrying a NUL', 'app\0le'],
    ])('rejects a term that is %s', (_label, value) => {
        expect(field.safeParse(value).success).toBe(false);
    });
});
