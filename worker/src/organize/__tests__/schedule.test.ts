import { describe, expect, it } from 'vitest';
import { msUntilNextRun } from '@/organize/schedule.js';
import { config } from '@/lib/config.js';

const HOUR_MS = 3_600_000;

/** The configured run hour in New York, as a UTC instant on a given date. */
const runHourUtcOffset = 4; // EDT in September

describe('msUntilNextRun', () => {
    it('waits the rest of the day when the run hour has just passed', () => {
        // 19:30 New York on a Friday in September
        const now = new Date(Date.UTC(2026, 8, 4, config.organize.runHourEt + runHourUtcOffset, 30));
        expect(msUntilNextRun(now)).toBeCloseTo(23.5 * HOUR_MS, -3);
    });

    it('waits the remainder of the hour when the run hour is next', () => {
        const now = new Date(Date.UTC(2026, 8, 4, config.organize.runHourEt + runHourUtcOffset - 1, 0));
        expect(msUntilNextRun(now)).toBe(HOUR_MS);
    });

    it('never returns zero or a negative wait, whatever the time of day', () => {
        for (let hour = 0; hour < 24; hour += 1) {
            const now = new Date(Date.UTC(2026, 8, 4, hour, 17, 3));
            const wait = msUntilNextRun(now);
            expect(wait).toBeGreaterThan(0);
            expect(wait).toBeLessThanOrEqual(24 * HOUR_MS);
        }
    });

    it('accounts for the offset moving, not for a fixed one — the same UTC hour differs across DST', () => {
        const summer = msUntilNextRun(new Date(Date.UTC(2026, 6, 1, 12, 0)));
        const winter = msUntilNextRun(new Date(Date.UTC(2026, 11, 1, 12, 0)));
        expect(summer).not.toBe(winter);
        expect(Math.abs(summer - winter)).toBe(HOUR_MS);
    });

    it('handles midnight New York, which some runtimes render as hour 24', () => {
        // 00:30 New York
        const now = new Date(Date.UTC(2026, 8, 4, 4, 30));
        expect(msUntilNextRun(now)).toBe((config.organize.runHourEt - 0.5) * HOUR_MS);
    });

    it('defaults to the current clock', () => {
        const wait = msUntilNextRun();
        expect(wait).toBeGreaterThan(0);
        expect(wait).toBeLessThanOrEqual(24 * HOUR_MS);
    });
});
