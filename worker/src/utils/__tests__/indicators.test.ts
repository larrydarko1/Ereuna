import { describe, expect, it } from 'vitest';
import {
    averageDailyVolatility,
    cagr,
    changeOver,
    ema,
    extremes,
    macd,
    numeric,
    rsi,
    sma,
    standardDeviation,
} from '@/utils/indicators.js';

/** An ascending series, oldest first — the order every function here expects. */
const rising = Array.from({ length: 30 }, (_, index) => 100 + index);

describe('sma', () => {
    it('averages the newest bars, not the oldest', () => {
        expect(sma(rising, 3)).toBe(128);
    });

    it('is null when the series is shorter than the window', () => {
        expect(sma([1, 2], 5)).toBeNull();
    });
});

describe('rsi', () => {
    it('reads 100 when nothing has fallen', () => {
        expect(rsi(rising)).toBe(100);
    });

    it('reads 50 on a flat series rather than dividing by zero', () => {
        expect(rsi(new Array(20).fill(10))).toBe(50);
    });

    it('sits below 50 when losses outweigh gains', () => {
        const falling = Array.from({ length: 20 }, (_, index) => 100 - index);
        expect(rsi(falling)).toBe(0);
    });

    it('averages over the period, not over the days that moved', () => {
        // Fourteen changes: thirteen of +1 and one of -13. Averaging each side
        // by its own count gives 1 and 13, and a reading of 7; averaging both
        // over the period gives 13/14 and 13/14, and a reading of 50
        const series = [100, 87, ...Array.from({ length: 13 }, (_, index) => 88 + index)];
        expect(rsi(series)).toBe(50);
    });

    it('is null before there are enough changes', () => {
        expect(rsi([1, 2, 3])).toBeNull();
    });
});

describe('changeOver', () => {
    it('divides by the earlier price, so a double is +100%', () => {
        expect(changeOver([100, 200], 1)).toBe(1);
    });

    it('counts back the given number of bars', () => {
        expect(changeOver([100, 110, 120], 2)).toBeCloseTo(0.2);
    });

    it('is null when the series does not reach that far back', () => {
        expect(changeOver([100, 110], 5)).toBeNull();
    });
});

describe('averageDailyVolatility', () => {
    it('is unchanged when every price is scaled by the same factor', () => {
        const prices = [10, 11, 10.5, 11.5, 11, 12];
        const scaled = prices.map((price) => price * 100);
        expect(averageDailyVolatility(scaled, 5)).toBeCloseTo(averageDailyVolatility(prices, 5) ?? 0, 9);
    });

    it('is zero for a series that does not move', () => {
        expect(averageDailyVolatility(new Array(10).fill(50), 5)).toBeCloseTo(0);
    });
});

describe('extremes', () => {
    it('handles a series longer than the argument limit of a spread call', () => {
        const long = Array.from({ length: 200_000 }, (_, index) => index);
        expect(extremes(long)).toEqual({ high: 199_999, low: 0 });
    });

    it('is null on both sides when empty', () => {
        expect(extremes([])).toEqual({ high: null, low: null });
    });
});

describe('cagr', () => {
    it('compounds over the span given', () => {
        expect(cagr(100, 400, 2)).toBeCloseTo(1);
    });

    it('rejects a span too short to annualise', () => {
        expect(cagr(100, 110, 0.1)).toBeNull();
    });

    it('rejects a rate that can only come from bad reference data', () => {
        expect(cagr(0.0001, 100, 1)).toBeNull();
    });
});

describe('ema and macd', () => {
    it('seeds the average with the first value', () => {
        expect(ema([5, 5, 5], 3)[0]).toBe(5);
    });

    it('produces two aligned series', () => {
        const result = macd(rising);
        expect(result?.macd).toHaveLength(rising.length);
        expect(result?.signal).toHaveLength(rising.length);
    });

    it('is null before there are enough bars for the slow leg', () => {
        expect(macd([1, 2, 3])).toBeNull();
    });
});

describe('numeric', () => {
    it('reads the shapes a missing number arrives in', () => {
        expect(numeric(4)).toBe(4);
        expect(numeric('4.5')).toBe(4.5);
        expect(numeric('NaN')).toBeNull();
        expect(numeric('')).toBeNull();
        expect(numeric(null)).toBeNull();
        expect(numeric(Infinity)).toBeNull();
    });
});

describe('standardDeviation', () => {
    it('is zero for a constant series', () => {
        expect(standardDeviation([3, 3, 3])).toBe(0);
    });
});
