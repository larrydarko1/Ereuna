import { describe, expect, it } from 'vitest';

import { calculateSlope, getPivots } from '@/lib/charting/patterns/pivots';
import { type OHLCData, type PivotPoint } from '@/lib/charting/patterns/types';

/** A bar whose high and low are the same figure, so a series reads as one line. */
function bar(index: number, price: number): OHLCData {
    return { time: index * 60, open: price, high: price, low: price, close: price };
}

function pivot(index: number, price: number): PivotPoint {
    return { index, time: index * 60, price };
}

describe('getPivots', () => {
    it('finds the bar that is highest within the window either side of it', () => {
        const data = [
            ...Array.from({ length: 5 }, (_, i) => bar(i, 100)),
            bar(5, 120),
            ...Array.from({ length: 5 }, (_, i) => bar(i + 6, 100)),
        ];

        const { highs } = getPivots(data, { leftBars: 5, rightBars: 5 });

        expect(highs).toEqual([{ index: 5, time: 300, price: 120 }]);
    });

    it('finds a low the same way', () => {
        const data = [
            ...Array.from({ length: 5 }, (_, i) => bar(i, 100)),
            bar(5, 80),
            ...Array.from({ length: 5 }, (_, i) => bar(i + 6, 100)),
        ];

        const { lows } = getPivots(data, { leftBars: 5, rightBars: 5 });

        expect(lows).toEqual([{ index: 5, time: 300, price: 80 }]);
    });

    it('finds no pivot at all in a flat run, rather than picking one bar out of it', () => {
        const data = Array.from({ length: 20 }, (_, i) => bar(i, 100));

        const { highs, lows } = getPivots(data);

        expect(highs).toHaveLength(0);
        expect(lows).toHaveLength(0);
    });

    it('ignores the bars at either end, which have no window to be highest in', () => {
        const data = [bar(0, 200), ...Array.from({ length: 9 }, (_, i) => bar(i + 1, 100)), bar(10, 200)];

        const { highs } = getPivots(data, { leftBars: 2, rightBars: 2 });

        expect(highs).toHaveLength(0);
    });

    it('takes a narrower window when it is given one', () => {
        const data = [bar(0, 100), bar(1, 100), bar(2, 110), bar(3, 100), bar(4, 100)];

        expect(getPivots(data, { leftBars: 2, rightBars: 2 }).highs).toHaveLength(1);
        expect(getPivots(data, { leftBars: 5, rightBars: 5 }).highs).toHaveLength(0);
    });

    it('has nothing to say about a series shorter than its own window', () => {
        expect(getPivots([bar(0, 100), bar(1, 101)])).toEqual({ highs: [], lows: [] });
    });
});

describe('calculateSlope', () => {
    it('answers zero for fewer than two points', () => {
        expect(calculateSlope([])).toBe(0);
        expect(calculateSlope([pivot(0, 100)])).toBe(0);
    });

    it('answers zero for a flat run', () => {
        expect(calculateSlope([pivot(0, 100), pivot(5, 100), pivot(9, 100)])).toBe(0);
    });

    it('answers the rise per point for a straight climb', () => {
        expect(calculateSlope([pivot(0, 100), pivot(3, 110), pivot(7, 120)])).toBeCloseTo(10, 10);
    });

    it('answers a negative for a fall', () => {
        expect(calculateSlope([pivot(0, 120), pivot(3, 110), pivot(7, 100)])).toBeCloseTo(-10, 10);
    });

    it('regresses on the ordinal position, not on the time each pivot sits at', () => {
        // The same three prices, spaced evenly and then unevenly in time
        const even = calculateSlope([pivot(0, 100), pivot(1, 110), pivot(2, 120)]);
        const uneven = calculateSlope([pivot(0, 100), pivot(40, 110), pivot(41, 120)]);

        expect(uneven).toBeCloseTo(even, 10);
    });
});
