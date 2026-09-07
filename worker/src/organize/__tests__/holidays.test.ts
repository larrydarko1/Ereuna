import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, setPayload, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const logged: { errors: unknown[] } = { errors: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/logger.js', () => ({
    logger: {
        error: (payload: unknown): void => {
            logged.errors.push(payload);
        },
        info: (): void => {},
        warn: (): void => {},
        debug: (): void => {},
    },
}));

const { updateHolidays } = await import('@/organize/holidays.js');

const NOW = new Date('2026-09-05T00:00:00.000Z');

beforeEach(() => {
    db.current = fakeDb();
    logged.errors = [];
});

describe('updateHolidays', () => {
    it('upserts the one `Holidays` document', async () => {
        db.current = fakeDb({ Stats: [] });
        await updateHolidays(NOW);
        const [write] = db.current.of('Stats').writes;
        expect(write?.args[0]).toEqual({ _id: 'Holidays' });
        expect(write?.args[2]).toEqual({ upsert: true });
    });

    it('covers this year and the next, and says how many it wrote', async () => {
        db.current = fakeDb({ Stats: [] });
        const count = await updateHolidays(NOW);
        const { Holidays } = setPayload<{ Holidays: { date: string }[]; updatedAt: Date }>(db.current.of('Stats'));
        expect(Holidays).toHaveLength(count);
        const years = new Set(Holidays.map((day) => day.date.slice(0, 4)));
        expect([...years].sort()).toEqual(['2026', '2027']);
    });

    it('stamps the document with the instant it was given', async () => {
        db.current = fakeDb({ Stats: [] });
        await updateHolidays(NOW);
        expect(setPayload<{ updatedAt: Date }>(db.current.of('Stats')).updatedAt).toEqual(NOW);
    });

    it('defaults to the current clock', async () => {
        db.current = fakeDb({ Stats: [] });
        await expect(updateHolidays()).resolves.toBeGreaterThan(0);
    });
});
