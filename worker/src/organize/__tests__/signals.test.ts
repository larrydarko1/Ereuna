import { describe, expect, it } from 'vitest';
import type { Series } from '@/organize/bars.js';
import { generateSignals, SIGNAL_MIN_BARS } from '@/organize/signals.js';

const DAY = 86_400_000;
const START = Date.UTC(2026, 0, 1);

/** A series of `closes`, dated one day apart, with a flat volume unless given. */
function series(closes: number[], volumes = closes.map(() => 1_000)): Series {
    return {
        timestamps: closes.map((_, index) => new Date(START + index * DAY)),
        opens: [...closes],
        highs: [...closes],
        lows: [...closes],
        closes,
        volumes,
    };
}

/** 250 bars that drift up, so the long moving average has something to sit on. */
const drifting = Array.from({ length: 250 }, (_, index) => 100 + index * 0.1);

describe('generateSignals', () => {
    it('produces nothing below the bar count the crossings need', () => {
        expect(generateSignals(series(drifting.slice(0, SIGNAL_MIN_BARS - 1)))).toEqual([]);
    });

    it('dates a signal by the bar that fired it, not by the day it was computed', () => {
        const closes = [...drifting];
        closes[closes.length - 1] = 60; // A drop steep enough to force RSI down
        const signals = generateSignals(series(closes));

        const last = new Date(START + (closes.length - 1) * DAY).toISOString().slice(0, 10);
        expect(signals.length).toBeGreaterThan(0);
        for (const signal of signals) expect(signal.date).toBe(last);
    });

    it('calls an oversold reading a buy', () => {
        const closes = [...drifting];
        for (let index = closes.length - 20; index < closes.length; index += 1) closes[index] = 200 - index;
        const strategies = generateSignals(series(closes)).map((signal) => signal.strategy);
        expect(strategies).toContain('RSI_Oversold');
    });

    it('fires a golden cross on the bar the averages cross, and not on the next one', () => {
        // Flat for long enough that both averages settle together, then a jump
        // that pulls the 50-day above the 200-day
        const flat = new Array(220).fill(100);
        const jump = [...flat, ...new Array(30).fill(160)];

        const crossing = firstCrossIndex(jump);
        expect(crossing).toBeGreaterThan(0);

        const atCross = generateSignals(series(jump.slice(0, crossing + 1)));
        const afterCross = generateSignals(series(jump.slice(0, crossing + 2)));
        expect(atCross.map((signal) => signal.strategy)).toContain('Golden_Cross');
        expect(afterCross.map((signal) => signal.strategy)).not.toContain('Golden_Cross');
    });

    it('needs the volume spike and the move together', () => {
        const closes = [...drifting];
        closes[closes.length - 1] = (closes[closes.length - 2] ?? 100) * 1.1;

        const quiet = generateSignals(series(closes));
        expect(quiet.map((signal) => signal.strategy)).not.toContain('Volume_Breakout');

        const volumes = closes.map(() => 1_000);
        volumes[volumes.length - 1] = 100_000;
        const loud = generateSignals(series(closes, volumes));
        expect(loud.map((signal) => signal.strategy)).toContain('Volume_Breakout');
    });

    it('measures the volume spike against a baseline that excludes the spike', () => {
        // A single bar at three times the baseline is a spike; it would not be
        // one if it were averaged into its own baseline
        const closes = [...drifting];
        closes[closes.length - 1] = (closes[closes.length - 2] ?? 100) * 1.05;
        const volumes = closes.map(() => 1_000);
        volumes[volumes.length - 1] = 2_500;

        expect(generateSignals(series(closes, volumes)).map((signal) => signal.strategy)).toContain('Volume_Breakout');
    });
});

/** The first bar at which the 50-bar average rises above the 200-bar one. */
function firstCrossIndex(closes: readonly number[]): number {
    const mean = (end: number, period: number): number =>
        closes.slice(end - period + 1, end + 1).reduce((sum, value) => sum + value, 0) / period;

    for (let index = 200; index < closes.length; index += 1) {
        if (mean(index - 1, 50) <= mean(index - 1, 200) && mean(index, 50) > mean(index, 200)) return index;
    }
    return -1;
}
