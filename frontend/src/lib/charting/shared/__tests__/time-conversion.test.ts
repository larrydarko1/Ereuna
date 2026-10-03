import { describe, expect, it } from 'vitest';

import { secondsToTime, timeToTimestamp } from '@/lib/charting/shared/time-conversion';

describe('timeToTimestamp', () => {
    it('passes epoch seconds through', () => {
        expect(timeToTimestamp(secondsToTime(1772461800))).toBe(1772461800);
    });

    it('reads a business day string as midnight UTC', () => {
        expect(timeToTimestamp('2026-03-02')).toBe(Date.UTC(2026, 2, 2) / 1000);
    });

    it('reads a business day object as midnight UTC, not local midnight', () => {
        expect(timeToTimestamp({ year: 2026, month: 3, day: 2 })).toBe(Date.UTC(2026, 2, 2) / 1000);
    });
});

describe('secondsToTime', () => {
    it('is the epoch second itself, as the chart takes it', () => {
        expect(secondsToTime(1772461800)).toBe(1772461800);
    });
});
