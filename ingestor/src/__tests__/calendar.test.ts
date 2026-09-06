import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const logged: { warnings: unknown[]; errors: unknown[] } = { warnings: [], errors: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/logger.js', () => ({
    logger: {
        warn: (payload: unknown): void => {
            logged.warnings.push(payload);
        },
        error: (payload: unknown): void => {
            logged.errors.push(payload);
        },
        info: (): void => {},
        debug: (): void => {},
    },
}));

const { getHolidays, isHoliday, isMarketHours } = await import('@/calendar.js');

beforeEach(() => {
    db.current = fakeDb();
    logged.warnings = [];
    logged.errors = [];
});

describe('getHolidays', () => {
    it('reads the one `Holidays` document and lifts out the dates', async () => {
        db.current = fakeDb({
            Stats: [{ _id: 'Holidays', Holidays: [{ date: '2026-01-01', name: 'New Year' }] }],
        });
        await expect(getHolidays()).resolves.toEqual(['2026-01-01']);
        expect(db.current.of('Stats').filters[0]).toEqual({ _id: 'Holidays' });
    });

    it('ignores an entry with no usable date', async () => {
        db.current = fakeDb({
            Stats: [{ Holidays: [{ date: '2026-01-01' }, { name: 'nameless' }, null, { date: 20_260_101 }] }],
        });
        await expect(getHolidays()).resolves.toEqual(['2026-01-01']);
    });

    it.each([
        ['no document at all', []],
        ['a document with no calendar', [{ _id: 'Holidays' }]],
        ['a calendar that is not an array', [{ _id: 'Holidays', Holidays: 'none' }]],
    ])('fails open on %s — a silent feed is worse than ingesting a closed day', async (_label, seed) => {
        db.current = fakeDb({ Stats: seed });
        await expect(getHolidays()).resolves.toEqual([]);
    });

    it('fails open when the read threw, and says so', async () => {
        db.current = fakeDb({ Stats: [] });
        db.current.of('Stats').findOne.mockRejectedValueOnce(new Error('not primary'));
        await expect(getHolidays()).resolves.toEqual([]);
        expect(logged.errors).toHaveLength(1);
    });
});

describe('isHoliday', () => {
    it("matches a date in the exchange's own timezone, not the server's", () => {
        // 01:00 UTC on the 2nd is still the 1st in New York
        expect(isHoliday(['2026-01-01'], new Date('2026-01-02T01:00:00.000Z'))).toBe(true);
    });

    it('is false on a day that is not listed', () => {
        expect(isHoliday(['2026-01-01'], new Date('2026-06-15T15:00:00.000Z'))).toBe(false);
    });

    it('is false against an empty calendar, which is what the fail-open produces', () => {
        expect(isHoliday([], new Date('2026-01-01T15:00:00.000Z'))).toBe(false);
    });

    it('defaults to the current clock', () => {
        expect(isHoliday([])).toBe(false);
    });
});

describe('isMarketHours', () => {
    it('is re-exported from the shared helper, so the API cannot disagree with it', () => {
        // A Friday inside the session, and the Saturday after it
        expect(isMarketHours(new Date('2026-09-04T15:00:00.000Z'))).toBe(true);
        expect(isMarketHours(new Date('2026-09-05T15:00:00.000Z'))).toBe(false);
    });
});
