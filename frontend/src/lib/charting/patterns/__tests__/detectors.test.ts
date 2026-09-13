import { describe, expect, it } from 'vitest';

import {
    detectDoubleBottoms,
    detectDoubleTops,
    detectFlags,
    detectHeadAndShoulders,
    detectInverseHeadAndShoulders,
    detectTriangles,
} from '@/lib/charting/patterns/detectors';
import { type OHLCData, type PivotPoint } from '@/lib/charting/patterns/types';

function pivot(index: number, price: number): PivotPoint {
    return { index, time: index * 60, price };
}

function bar(index: number, close: number): OHLCData {
    return { time: index * 60, open: close, high: close + 1, low: close - 1, close };
}

/** A run of pivots at evenly spaced indices, which is what a slope is read off. */
function run(prices: number[], step = 6, from = 0): PivotPoint[] {
    return prices.map((price, i) => pivot(from + i * step, price));
}

describe('double tops', () => {
    it('matches two peaks at a similar level, far enough apart', () => {
        const found = detectDoubleTops([pivot(0, 100), pivot(10, 100.5)]);

        expect(found).toHaveLength(1);
        expect(found[0]?.type).toBe('doubleTop');
        expect(found[0]?.timeframe).toEqual({ start: 0, end: 600 });
    });

    it('is most confident when the two peaks are level', () => {
        const level = detectDoubleTops([pivot(0, 100), pivot(10, 100)])[0];
        const ragged = detectDoubleTops([pivot(0, 100), pivot(10, 101.5)])[0];

        expect(level?.confidence).toBeCloseTo(1, 10);
        expect(ragged?.confidence).toBeLessThan(1);
    });

    it('refuses two peaks at different levels', () => {
        expect(detectDoubleTops([pivot(0, 100), pivot(10, 130)])).toHaveLength(0);
    });

    it('refuses two peaks too close together to be separate', () => {
        expect(detectDoubleTops([pivot(0, 100), pivot(2, 100)])).toHaveLength(0);
    });

    it('reads every pair in a longer run of peaks', () => {
        expect(detectDoubleTops([pivot(0, 100), pivot(10, 100), pivot(20, 100)])).toHaveLength(3);
    });

    it('has nothing to say about fewer than two peaks', () => {
        expect(detectDoubleTops([])).toHaveLength(0);
        expect(detectDoubleTops([pivot(0, 100)])).toHaveLength(0);
    });

    it('widens with the tolerance it is given', () => {
        const troughs = [pivot(0, 100), pivot(10, 104)];

        expect(detectDoubleTops(troughs, 0.02)).toHaveLength(0);
        expect(detectDoubleTops(troughs, 0.08)).toHaveLength(1);
    });
});

describe('double bottoms', () => {
    it('matches two troughs at a similar level, far enough apart', () => {
        const found = detectDoubleBottoms([pivot(0, 80), pivot(10, 80.4)]);

        expect(found).toHaveLength(1);
        expect(found[0]?.type).toBe('doubleBottom');
    });

    it('refuses two troughs at different levels, or too close together', () => {
        expect(detectDoubleBottoms([pivot(0, 80), pivot(10, 110)])).toHaveLength(0);
        expect(detectDoubleBottoms([pivot(0, 80), pivot(3, 80)])).toHaveLength(0);
    });
});

describe('head and shoulders', () => {
    it('matches a high middle peak between two level shoulders', () => {
        const found = detectHeadAndShoulders([pivot(0, 100), pivot(10, 110), pivot(20, 100)]);

        expect(found).toHaveLength(1);
        expect(found[0]?.type).toBe('headAndShoulders');
        expect(found[0]?.points).toHaveLength(3);
    });

    it('refuses a middle peak that is not the highest of the three', () => {
        expect(detectHeadAndShoulders([pivot(0, 110), pivot(10, 105), pivot(20, 100)])).toHaveLength(0);
    });

    it('refuses shoulders at different levels', () => {
        expect(detectHeadAndShoulders([pivot(0, 100), pivot(10, 130), pivot(20, 120)])).toHaveLength(0);
    });

    it('refuses a head that barely clears the shoulder line', () => {
        // Within the 2% prominence floor: a flat triple top, not a readable head
        expect(detectHeadAndShoulders([pivot(0, 100), pivot(10, 101), pivot(20, 100)])).toHaveLength(0);
    });

    it('has nothing to say about fewer than three peaks', () => {
        expect(detectHeadAndShoulders([pivot(0, 100), pivot(10, 110)])).toHaveLength(0);
    });
});

describe('inverse head and shoulders', () => {
    it('matches a low middle trough between two level shoulders', () => {
        const found = detectInverseHeadAndShoulders([pivot(0, 100), pivot(10, 90), pivot(20, 100)]);

        expect(found).toHaveLength(1);
        expect(found[0]?.type).toBe('inverseHeadAndShoulders');
    });

    it('refuses a middle trough that is not the lowest of the three', () => {
        expect(detectInverseHeadAndShoulders([pivot(0, 90), pivot(10, 95), pivot(20, 100)])).toHaveLength(0);
    });

    it('refuses shoulders at different levels, and a head that barely drops', () => {
        expect(detectInverseHeadAndShoulders([pivot(0, 100), pivot(10, 70), pivot(20, 85)])).toHaveLength(0);
        expect(detectInverseHeadAndShoulders([pivot(0, 100), pivot(10, 99), pivot(20, 100)])).toHaveLength(0);
    });
});

describe('triangles', () => {
    it('reads flat resistance over rising support as ascending', () => {
        const found = detectTriangles(run([100, 100, 100]), run([90, 92, 94]));

        expect(found.map((match) => match.type)).toContain('ascendingTriangle');
    });

    it('reads falling resistance over flat support as descending', () => {
        const found = detectTriangles(run([110, 108, 106]), run([90, 90, 90]));

        expect(found.map((match) => match.type)).toContain('descendingTriangle');
    });

    it('reads two lines converging on each other as symmetric', () => {
        const found = detectTriangles(run([110, 108, 106]), run([90, 92, 94]));

        expect(found.map((match) => match.type)).toContain('symmetricTriangle');
    });

    it('reads nothing out of two lines that run parallel', () => {
        expect(detectTriangles(run([110, 112, 114]), run([90, 92, 94]))).toHaveLength(0);
    });

    it('looks only at the last five pivots on each side', () => {
        // The early pivots swing wildly; the last five are the flat-over-rising shape
        const highs = [...run([200, 40, 180], 6), ...run([100, 100, 100, 100, 100], 6, 30)];
        const lows = [...run([10, 300, 20], 6), ...run([90, 91, 92, 93, 94], 6, 30)];

        expect(detectTriangles(highs, lows).map((match) => match.type)).toContain('ascendingTriangle');
    });

    it('has nothing to say with fewer than two pivots on either side', () => {
        expect(detectTriangles([pivot(0, 100)], run([90, 92]))).toHaveLength(0);
        expect(detectTriangles(run([100, 100]), [pivot(0, 90)])).toHaveLength(0);
    });
});

describe('flags', () => {
    /** Twenty-five bars climbing hard, then fifteen drifting flat. */
    function afterRise(drift: number): OHLCData[] {
        const climb = Array.from({ length: 25 }, (_, i) => bar(i, 100 + i * 2));
        const flat = Array.from({ length: 15 }, (_, i) => bar(25 + i, 150 + i * drift));
        return [...climb, ...flat];
    }

    it('reads a sharp rise followed by a flat drift as a bullish flag', () => {
        const data = afterRise(-0.05);
        const highs = run([151, 150.5, 150], 5, 26);
        const lows = run([149, 148.5, 148], 5, 27);

        const found = detectFlags(data, highs, lows);

        expect(found.map((match) => match.type)).toContain('bullishFlag');
    });

    it('reads a sharp fall followed by a flat drift as a bearish flag', () => {
        const fall = Array.from({ length: 25 }, (_, i) => bar(i, 200 - i * 2));
        const flat = Array.from({ length: 15 }, (_, i) => bar(25 + i, 150 + i * 0.05));
        const highs = run([151, 151.5, 152], 5, 26);
        const lows = run([149, 149.5, 150], 5, 27);

        const found = detectFlags([...fall, ...flat], highs, lows);

        expect(found.map((match) => match.type)).toContain('bearishFlag');
    });

    it('reads nothing where there was no sharp move to consolidate after', () => {
        const drifting = Array.from({ length: 40 }, (_, i) => bar(i, 100 + i * 0.01));
        const highs = run([101, 100.5, 100], 5, 26);
        const lows = run([99, 98.5, 98], 5, 27);

        expect(detectFlags(drifting, highs, lows)).toHaveLength(0);
    });

    it('reads nothing where the consolidation is not parallel', () => {
        const data = afterRise(-0.05);
        const highs = run([160, 150, 140], 5, 26);
        const lows = run([140, 145, 150], 5, 27);

        expect(detectFlags(data, highs, lows)).toHaveLength(0);
    });

    it('has nothing to say about fewer than twenty bars, or too few pivots', () => {
        const short = Array.from({ length: 10 }, (_, i) => bar(i, 100));
        expect(detectFlags(short, run([101, 100]), run([99, 98]))).toHaveLength(0);
        expect(detectFlags(afterRise(0), [pivot(30, 150)], run([149, 148], 5, 31))).toHaveLength(0);
    });

    it('has nothing to say when no pivot falls inside the consolidation', () => {
        const data = afterRise(-0.05);
        const highs = run([120, 118, 116], 3, 0);
        const lows = run([110, 112, 114], 3, 1);

        expect(detectFlags(data, highs, lows)).toHaveLength(0);
    });
});
