import { describe, expect, it } from 'vitest';
import type { Time } from '@/lib/lightweight-charts';
import { timeKey, timeToDate, timeToIsoDate, timeValue } from '@/utils/chartTime';

const businessDay = { year: 2026, month: 3, day: 2 } as unknown as Time;

describe('timeValue', () => {
    it('passes an intraday timestamp through — it is already seconds', () => {
        expect(timeValue(1772461800 as Time)).toBe(1772461800);
    });

    it('reads a business-day string as UTC midnight, not as local midnight', () => {
        expect(timeValue('2026-03-02' as Time)).toBe(Date.UTC(2026, 2, 2) / 1000);
    });

    it('reads a BusinessDay object, whose month is one-based', () => {
        expect(timeValue(businessDay)).toBe(Date.UTC(2026, 2, 2) / 1000);
    });
});

describe('timeKey', () => {
    it('keeps a business-day string as itself', () => {
        expect(timeKey('2026-03-02' as Time)).toBe('2026-03-02');
    });

    it('gives every BusinessDay its own key, rather than one shared [object Object]', () => {
        const other = { year: 2026, month: 3, day: 3 } as unknown as Time;

        expect(timeKey(businessDay)).not.toBe(timeKey(other));
    });

    it('keys an intraday bar by its seconds', () => {
        expect(timeKey(1772461800 as Time)).toBe('1772461800');
    });
});

describe('timeToDate', () => {
    it('answers the instant the bar sits at', () => {
        expect(timeToDate('2026-03-02' as Time)?.toISOString()).toBe('2026-03-02T00:00:00.000Z');
    });

    it('answers null when the value will not parse', () => {
        expect(timeToDate('not a date' as Time)).toBeNull();
    });
});

describe('timeToIsoDate', () => {
    it('trims a business-day string to the date', () => {
        expect(timeToIsoDate('2026-03-02' as Time)).toBe('2026-03-02');
    });

    it('takes the UTC day of an intraday timestamp', () => {
        expect(timeToIsoDate((Date.UTC(2026, 2, 2, 14, 30) / 1000) as Time)).toBe('2026-03-02');
    });

    it('answers an empty string when there is no date to write', () => {
        expect(timeToIsoDate(Number.NaN as Time)).toBe('');
    });
});
