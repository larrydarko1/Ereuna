import { describe, expect, it } from 'vitest';
import { numeric } from '#market/numeric.js';

describe('numeric', () => {
    it('keeps a finite number', () => {
        expect(numeric(12.5)).toBe(12.5);
        expect(numeric(0)).toBe(0);
        expect(numeric(-3)).toBe(-3);
    });

    it('rejects a number that is not finite', () => {
        expect(numeric(Number.NaN)).toBeNull();
        expect(numeric(Infinity)).toBeNull();
    });

    it('parses a numeric string', () => {
        expect(numeric('12.5')).toBe(12.5);
        expect(numeric(' 42 ')).toBe(42);
    });

    it('treats the empty string, whitespace and "NaN" as missing', () => {
        expect(numeric('')).toBeNull();
        expect(numeric('   ')).toBeNull();
        expect(numeric('NaN')).toBeNull();
    });

    it('rejects anything that is not a number or a string', () => {
        expect(numeric(null)).toBeNull();
        expect(numeric(undefined)).toBeNull();
        expect(numeric({})).toBeNull();
        expect(numeric(true)).toBeNull();
    });
});
