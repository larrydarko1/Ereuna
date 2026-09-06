import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { DRAWING_KINDS, type ChartDrawings } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const { clearDrawings, getDrawings, saveDrawings } = await import('@/services/chart/chart-drawings.js');

const USER_ID = new ObjectId('507f1f77bcf86cd799439011');

const empty = (): ChartDrawings => ({
    trendLines: [],
    boxes: [],
    textAnnotations: [],
    freehandPaths: [],
    priceLevels: [],
});

const withOne = (): ChartDrawings => ({ ...empty(), priceLevels: [{ price: 100 }] as never });

beforeEach(() => {
    db.current = fakeDb({ ChartDrawings: [] });
});

describe('getDrawings', () => {
    it('reads by user, symbol and timeframe together', async () => {
        await getDrawings(USER_ID, 'AAPL', 'daily');
        expect(db.current.of('ChartDrawings').filters[0]).toEqual({
            userId: USER_ID,
            symbol: 'AAPL',
            timeframe: 'daily',
        });
    });

    it('answers an empty set for a chart with nothing saved', async () => {
        db.current.of('ChartDrawings').results.findOne = null;
        await expect(getDrawings(USER_ID, 'AAPL', 'daily')).resolves.toEqual(empty());
    });

    it('gives every kind a list, so the client never has to check for undefined', async () => {
        db.current.of('ChartDrawings').results.findOne = null;
        const drawings = await getDrawings(USER_ID, 'AAPL', 'daily');
        for (const kind of DRAWING_KINDS) expect(drawings[kind]).toEqual([]);
    });

    it('returns what was saved', async () => {
        db.current = fakeDb({ ChartDrawings: [{ drawings: withOne() }] });
        await expect(getDrawings(USER_ID, 'AAPL', 'daily')).resolves.toEqual(withOne());
    });
});

describe('saveDrawings', () => {
    it('upserts the set against the one chart', async () => {
        await saveDrawings(USER_ID, 'AAPL', 'daily', withOne());
        const [filter, update, options] = db.current.of('ChartDrawings').writes[0]?.args ?? [];

        expect(filter).toEqual({ userId: USER_ID, symbol: 'AAPL', timeframe: 'daily' });
        expect(options).toEqual({ upsert: true });
        expect(update).toMatchObject({ $set: { drawings: withOne() } });
    });

    it('stamps the creation time only on insert', async () => {
        await saveDrawings(USER_ID, 'AAPL', 'daily', withOne());
        const update = db.current.of('ChartDrawings').writes[0]?.args[1] as {
            $setOnInsert: Record<string, unknown>;
        };
        expect(update.$setOnInsert).toMatchObject({ userId: USER_ID, symbol: 'AAPL', timeframe: 'daily' });
        expect(update.$setOnInsert.createdAt).toBeInstanceOf(Date);
    });

    it('deletes the document rather than storing an empty set', async () => {
        await expect(saveDrawings(USER_ID, 'AAPL', 'daily', empty())).resolves.toEqual(empty());
        expect(db.current.of('ChartDrawings').writes.map((w) => w.method)).toEqual(['deleteOne']);
    });

    it('returns what it stored', async () => {
        await expect(saveDrawings(USER_ID, 'AAPL', 'daily', withOne())).resolves.toEqual(withOne());
    });
});

describe('clearDrawings', () => {
    it("deletes the one chart's document", async () => {
        await clearDrawings(USER_ID, 'AAPL', 'daily');
        expect(db.current.of('ChartDrawings').writes[0]?.args[0]).toEqual({
            userId: USER_ID,
            symbol: 'AAPL',
            timeframe: 'daily',
        });
    });

    it('is a no-op rather than a 404 when there was nothing saved', async () => {
        db.current.of('ChartDrawings').results.deleteOne = { acknowledged: true, deletedCount: 0 };
        await expect(clearDrawings(USER_ID, 'AAPL', 'daily')).resolves.toBeUndefined();
    });
});
