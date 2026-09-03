import { describe, expect, it } from 'vitest';
import { isMarketHours, lastTradingDay } from '#market/hours.js';

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

describe('lastTradingDay', () => {
    it('returns today on a weekday', () => {
        expect(lastTradingDay(new Date('2026-03-10T15:00:00Z')).toISOString()).toBe('2026-03-10T00:00:00.000Z');
    });

    it('walks a Saturday back to Friday', () => {
        expect(lastTradingDay(new Date('2026-03-14T15:00:00Z')).toISOString()).toBe('2026-03-13T00:00:00.000Z');
    });

    it('walks a Sunday back to Friday', () => {
        expect(lastTradingDay(new Date('2026-03-15T15:00:00Z')).toISOString()).toBe('2026-03-13T00:00:00.000Z');
    });

    it('uses the New York date, so a late-evening UTC Saturday is still Friday', () => {
        // 01:00Z Sunday is 20:00 Saturday in New York.
        expect(lastTradingDay(new Date('2026-03-15T01:00:00Z')).toISOString()).toBe('2026-03-13T00:00:00.000Z');
    });
});
