import { describe, expect, it } from 'vitest';

import { growth } from '@/utils/numbers';

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
