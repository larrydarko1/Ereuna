import { describe, expect, it } from 'vitest';

import { distanceToSegment } from '@/lib/charting/shared/geometry';

describe('distanceToSegment', () => {
    it('measures the perpendicular drop when the foot lands on the segment', () => {
        expect(distanceToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3);
    });

    it('measures to the nearer end when the foot falls past it', () => {
        // The perpendicular to the infinite line is 3, but the segment stops at
        // x=10, so the click is 5 away from its end
        expect(distanceToSegment({ x: 14, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
        expect(distanceToSegment({ x: -4, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
    });

    it('is zero on the segment itself, including at either end', () => {
        expect(distanceToSegment({ x: 4, y: 4 }, { x: 0, y: 0 }, { x: 8, y: 8 })).toBe(0);
        expect(distanceToSegment({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 8, y: 8 })).toBe(0);
        expect(distanceToSegment({ x: 8, y: 8 }, { x: 0, y: 0 }, { x: 8, y: 8 })).toBe(0);
    });

    it('treats a zero-length segment as the point it is', () => {
        expect(distanceToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(5);
    });

    it('does not depend on which end is given first', () => {
        const from = { x: 2, y: 9 };
        const to = { x: 11, y: -4 };
        const point = { x: 6, y: 1 };

        expect(distanceToSegment(point, from, to)).toBeCloseTo(distanceToSegment(point, to, from), 10);
    });
});
