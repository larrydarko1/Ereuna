import { describe, expect, it } from 'vitest';
import { growth, numeric } from '@/utils/numbers';

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

describe('growth', () => {
    it('reports the percentage change', () => {
        expect(growth(150, 100)).toBe(50);
        expect(growth(50, 100)).toBe(-50);
    });

    it('reports no growth as zero', () => {
        expect(growth(100, 100)).toBe(0);
    });

    it('refuses to answer from a negative base — a smaller loss is not growth', () => {
        expect(growth(-5_000_000, -10_000_000)).toBeNull();
    });

    it('refuses to answer from a zero base', () => {
        expect(growth(10, 0)).toBeNull();
    });

    it('answers null when either side is missing', () => {
        expect(growth(null, 100)).toBeNull();
        expect(growth(100, null)).toBeNull();
    });
});
