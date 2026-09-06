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

const { updateCalendar, updateHolidays } = await import('@/organize/calendar.js');

const NOW = new Date('2026-09-05T00:00:00.000Z');

const events = (): Record<string, unknown>[] =>
    db.current
        .of('Calendar')
        .writes.flatMap((write) => write.args[0] as { updateOne: { update: { $set: Record<string, unknown> } } }[])
        .map((operation) => operation.updateOne.update.$set);

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

describe('updateCalendar', () => {
    it('reads only assets that are not delisted', async () => {
        db.current = fakeDb({ AssetInfo: [] });
        await updateCalendar(NOW);
        expect(db.current.of('AssetInfo').filters[0]).toEqual({ Delisted: { $ne: true } });
    });

    it('writes nothing when nothing is in the window', async () => {
        db.current = fakeDb({ AssetInfo: [{ Symbol: 'AAPL' }] });
        await expect(updateCalendar(NOW)).resolves.toBe(0);
        expect(db.current.of('Calendar').writes).toEqual([]);
    });

    it('publishes a dividend, a split and an earnings date from one asset', async () => {
        db.current = fakeDb({
            AssetInfo: [
                {
                    Symbol: 'AAPL',
                    dividends: [{ date: '2026-06-01', amount: 0.25 }],
                    splits: [{ date: '2026-05-01', ratio: 4 }],
                    quarterlyFinancials: [{ fiscalDateEnding: new Date('2026-06-30T00:00:00.000Z'), reportedEPS: 2 }],
                },
            ],
        });
        await expect(updateCalendar(NOW)).resolves.toBe(3);
        expect(events()).toEqual([
            { symbol: 'AAPL', type: 'Dividend', reportDate: new Date('2026-06-01T00:00:00.000Z'), amount: 0.25 },
            { symbol: 'AAPL', type: 'Split', reportDate: new Date('2026-05-01T00:00:00.000Z'), ratio: 4 },
            { symbol: 'AAPL', type: 'Earnings', reportDate: new Date('2026-06-30T00:00:00.000Z'), reportedEPS: 2 },
        ]);
    });

    it('upserts on (date, type, symbol) — the key that makes a rebuild idempotent', async () => {
        db.current = fakeDb({ AssetInfo: [{ Symbol: 'AAPL', dividends: [{ date: '2026-06-01', amount: 1 }] }] });
        await updateCalendar(NOW);
        const [operation] = db.current.of('Calendar').writes[0]?.args[0] as {
            updateOne: { filter: unknown; upsert: boolean };
        }[];
        expect(operation?.updateOne.filter).toEqual({
            reportDate: new Date('2026-06-01T00:00:00.000Z'),
            type: 'Dividend',
            symbol: 'AAPL',
        });
        expect(operation?.updateOne.upsert).toBe(true);
    });

    it('drops an event older than the two-year publishing window', async () => {
        db.current = fakeDb({ AssetInfo: [{ Symbol: 'AAPL', dividends: [{ date: '2020-01-01', amount: 1 }] }] });
        await expect(updateCalendar(NOW)).resolves.toBe(0);
    });

    it('keeps an event exactly on the window edge', async () => {
        db.current = fakeDb({ AssetInfo: [{ Symbol: 'AAPL', dividends: [{ date: '2024-09-06', amount: 1 }] }] });
        await expect(updateCalendar(NOW)).resolves.toBe(1);
    });

    it('normalises a mid-day timestamp to midnight, so one day is one row', async () => {
        db.current = fakeDb({
            AssetInfo: [{ Symbol: 'AAPL', dividends: [{ date: '2026-06-01T18:30:00.000Z', amount: 1 }] }],
        });
        await updateCalendar(NOW);
        expect(events()[0]?.reportDate).toEqual(new Date('2026-06-01T00:00:00.000Z'));
    });

    it.each([
        ['an unparseable date', 'whenever'],
        ['a number', 20_260_601],
        ['null', null],
    ])('drops an event dated %s', async (_label, date) => {
        db.current = fakeDb({ AssetInfo: [{ Symbol: 'AAPL', dividends: [{ date, amount: 1 }] }] });
        await expect(updateCalendar(NOW)).resolves.toBe(0);
    });

    it('records a null amount rather than dropping an event that has none', async () => {
        db.current = fakeDb({ AssetInfo: [{ Symbol: 'AAPL', dividends: [{ date: '2026-06-01' }] }] });
        await updateCalendar(NOW);
        expect(events()[0]).toMatchObject({ amount: null });
    });

    it('logs a failed write and finishes', async () => {
        db.current = fakeDb({ AssetInfo: [{ Symbol: 'AAPL', dividends: [{ date: '2026-06-01', amount: 1 }] }] });
        db.current.of('Calendar').bulkWrite.mockRejectedValueOnce(new Error('write conflict'));
        await expect(updateCalendar(NOW)).resolves.toBe(1);
        expect(logged.errors).toHaveLength(1);
    });

    it('defaults to the current clock', async () => {
        db.current = fakeDb({ AssetInfo: [] });
        await expect(updateCalendar()).resolves.toBe(0);
    });
});
