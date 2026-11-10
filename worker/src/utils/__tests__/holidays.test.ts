import { describe, expect, it } from 'vitest';

import { holidayCalendar, listSessions } from '@/utils/holidays.js';

const dates = (year: number): string[] => holidayCalendar(year, 1).map((holiday) => holiday.date);

describe('one year of the calendar', () => {
    it('gives the ten exchange holidays of 2026', () => {
        expect(dates(2026)).toEqual([
            '2026-01-01', // New Year's Day
            '2026-01-19', // Martin Luther King Jr. Day
            '2026-02-16', // Washington's Birthday
            '2026-04-03', // Good Friday
            '2026-05-25', // Memorial Day
            '2026-06-19', // Juneteenth
            '2026-07-03', // Independence Day, observed — the 4th is a Saturday
            '2026-09-07', // Labor Day
            '2026-11-26', // Thanksgiving
            '2026-12-25', // Christmas Day
        ]);
    });

    it('moves a Sunday holiday to the Monday after and a Saturday one to the Friday before', () => {
        // 2027: 4 July falls on a Sunday and 25 December on a Saturday
        expect(dates(2027)).toContain('2027-07-05');
        expect(dates(2027)).toContain('2027-12-24');
    });

    it('tracks Good Friday through the lunar calendar', () => {
        expect(dates(2027)).toContain('2027-03-26');
        expect(dates(2028)).toContain('2028-04-14');
    });

    it('returns them in date order', () => {
        const ordered = dates(2026);
        expect([...ordered].sort()).toEqual(ordered);
    });
});

describe('holidayCalendar', () => {
    it('spans the years asked for', () => {
        const calendar = holidayCalendar(2026, 2);
        expect(calendar).toHaveLength(20);
        expect(calendar.filter((holiday) => holiday.date.startsWith('2027'))).toHaveLength(10);
    });
});

describe('listSessions', () => {
    const days = (from: string, through: string): string[] =>
        listSessions(new Date(from), new Date(through)).map((day) => day.toISOString().slice(0, 10));

    it('lists the weekdays between two dates, both ends included', () => {
        expect(days('2026-11-06', '2026-11-10')).toEqual(['2026-11-06', '2026-11-09', '2026-11-10']);
    });

    it('skips an exchange holiday', () => {
        expect(days('2026-11-25', '2026-11-27')).toEqual(['2026-11-25', '2026-11-27']);
    });

    it('crosses into a new year with that year’s holidays', () => {
        expect(days('2026-12-31', '2027-01-04')).toEqual(['2026-12-31', '2027-01-04']);
    });

    it('stamps each session at UTC midnight, whatever the time of the bounds', () => {
        expect(listSessions(new Date('2026-11-10T23:00:00Z'), new Date('2026-11-10T01:00:00Z'))).toEqual([
            new Date('2026-11-10T00:00:00.000Z'),
        ]);
    });

    it('is empty when the range is backwards', () => {
        expect(days('2026-11-10', '2026-11-09')).toEqual([]);
    });
});
