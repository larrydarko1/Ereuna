import { describe, expect, it } from 'vitest';

import { isMarketHours, sessionClose } from '#market/hours.js';

/**
 * The dates below straddle a US daylight-saving change on purpose: the previous
 * implementation hardcoded a 13:30–20:00 UTC window, which is only correct for
 * part of the year.
 */
describe('isMarketHours', () => {
    it('is open at 10:00 ET on a summer weekday (EDT, UTC-4)', () => {
        expect(isMarketHours(new Date('2026-07-15T14:00:00Z'))).toBe(true);
    });

    it('is open at 10:00 ET on a winter weekday (EST, UTC-5)', () => {
        expect(isMarketHours(new Date('2026-01-14T15:00:00Z'))).toBe(true);
    });

    it('is closed at 09:00 ET, before the open', () => {
        expect(isMarketHours(new Date('2026-07-15T13:00:00Z'))).toBe(false);
    });

    it('is closed at 16:00 ET, on the close', () => {
        expect(isMarketHours(new Date('2026-07-15T20:00:00Z'))).toBe(false);
    });

    it('is closed at the weekend', () => {
        expect(isMarketHours(new Date('2026-07-18T14:00:00Z'))).toBe(false);
    });
});

describe('sessionClose', () => {
    it.each([
        ['a summer day (EDT)', '2026-07-15T00:00:00Z', '2026-07-15T20:00:00.000Z'],
        ['a winter day (EST)', '2026-11-10T00:00:00Z', '2026-11-10T21:00:00.000Z'],
        ['the day daylight time starts', '2026-03-08T00:00:00Z', '2026-03-08T20:00:00.000Z'],
        ['the day daylight time ends', '2026-11-01T00:00:00Z', '2026-11-01T21:00:00.000Z'],
    ])('is 16:00 New York on %s', (_label, day, close) => {
        expect(sessionClose(new Date(day)).toISOString()).toBe(close);
    });

    it('reads the date, not the time, of the instant it is given', () => {
        expect(sessionClose(new Date('2026-11-10T23:59:00Z')).toISOString()).toBe('2026-11-10T21:00:00.000Z');
    });
});
