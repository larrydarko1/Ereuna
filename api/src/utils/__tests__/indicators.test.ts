import { describe, expect, it } from 'vitest';
import { ema, sma } from '@/utils/indicators.js';

const bars = [10, 11, 12, 13, 14, 15].map((close, index) => ({ time: `2026-01-0${index + 1}`, close }));

describe('sma', () => {
    it('averages the trailing window and starts at the first full one', () => {
        expect(sma(bars, 3)).toEqual([
            { time: '2026-01-03', value: 11 },
            { time: '2026-01-04', value: 12 },
            { time: '2026-01-05', value: 13 },
            { time: '2026-01-06', value: 14 },
        ]);
    });

    it('returns nothing when there are fewer bars than the period', () => {
        expect(sma(bars, 10)).toEqual([]);
    });

    it('rejects a non-positive period rather than dividing by it', () => {
        expect(sma(bars, 0)).toEqual([]);
    });
});

describe('ema', () => {
    it('seeds on the simple average of the first window', () => {
        expect(ema(bars, 3)[0]).toEqual({ time: '2026-01-03', value: 11 });
    });

    it('reacts to a recent jump faster than the simple average', () => {
        // A flat series with a spike on the last bar. On a linear series the two
        // coincide, so the difference only shows where the trend actually breaks.
        const spiked = [10, 10, 10, 10, 30].map((close, index) => ({ time: `2026-01-0${index + 1}`, close }));

        const lastEma = ema(spiked, 3).at(-1)?.value ?? 0;
        const lastSma = sma(spiked, 3).at(-1)?.value ?? 0;

        expect(lastEma).toBeGreaterThan(lastSma);
    });

    it('emits one point per bar from the seed onwards', () => {
        expect(ema(bars, 3)).toHaveLength(bars.length - 2);
    });

    it('returns nothing when there are fewer bars than the period', () => {
        expect(ema(bars, 10)).toEqual([]);
    });
});
