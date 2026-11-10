import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OhlcvDoc } from '@ereuna/shared';

import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const { insertMissingBars, replaceBars } = await import('@/lib/candle-store.js');

const COLLECTION = 'OHCLVData1m';
const NINE_THIRTY = new Date('2026-09-04T13:30:00.000Z');
const NINE_THIRTY_ONE = new Date('2026-09-04T13:31:00.000Z');

function bar(overrides: Partial<OhlcvDoc> = {}): OhlcvDoc {
    return {
        tickerID: 'AAPL',
        timestamp: NINE_THIRTY,
        open: 100,
        high: 101,
        low: 99,
        close: 100.5,
        volume: 1_000,
        ...overrides,
    };
}

const methodsOn = (collection: string): string[] => db.current.of(collection).writes.map((write) => write.method);

beforeEach(() => {
    db.current = fakeDb();
});

describe('replaceBars', () => {
    it('touches nothing for an empty batch', async () => {
        await replaceBars(COLLECTION, []);
        expect(db.current.collection).not.toHaveBeenCalled();
    });

    it('deletes the stored copies before inserting, never updating — the server refuses updates here', async () => {
        await replaceBars(COLLECTION, [bar()]);
        expect(methodsOn(COLLECTION)).toEqual(['deleteMany', 'insertMany']);
    });

    it('deletes once per distinct timestamp, naming every symbol at it', async () => {
        await replaceBars(COLLECTION, [
            bar(),
            bar({ tickerID: 'MSFT' }),
            bar({ tickerID: 'AAPL', timestamp: NINE_THIRTY_ONE }),
        ]);

        const deletes = db.current.of(COLLECTION).writes.filter((write) => write.method === 'deleteMany');
        expect(deletes.map((write) => write.args[0])).toEqual([
            { timestamp: NINE_THIRTY, tickerID: { $in: ['AAPL', 'MSFT'] } },
            { timestamp: NINE_THIRTY_ONE, tickerID: { $in: ['AAPL'] } },
        ]);
    });

    it('keeps the last copy of a bar repeated within the batch', async () => {
        await replaceBars(COLLECTION, [bar({ close: 1 }), bar({ close: 2 })]);
        const insert = db.current.of(COLLECTION).writes.find((write) => write.method === 'insertMany');
        expect(insert?.args[0]).toEqual([bar({ close: 2 })]);
    });

    it('inserts unordered, so one rejected bar does not abandon the rest', async () => {
        await replaceBars(COLLECTION, [bar()]);
        const insert = db.current.of(COLLECTION).writes.find((write) => write.method === 'insertMany');
        expect(insert?.args[1]).toEqual({ ordered: false });
    });

    it('throws when the insert fails, so the caller can tell nothing was stored', async () => {
        db.current.of(COLLECTION).insertMany.mockRejectedValueOnce(new Error('not primary'));
        await expect(replaceBars(COLLECTION, [bar()])).rejects.toThrow('not primary');
    });
});

describe('insertMissingBars', () => {
    it('touches nothing for an empty batch', async () => {
        await expect(insertMissingBars(COLLECTION, [])).resolves.toBe(0);
        expect(db.current.collection).not.toHaveBeenCalled();
    });

    it('looks up only the keys it was given, grouped by timestamp', async () => {
        await insertMissingBars(COLLECTION, [bar(), bar({ tickerID: 'MSFT' })]);
        expect(db.current.of(COLLECTION).filters[0]).toEqual({
            $or: [{ timestamp: NINE_THIRTY, tickerID: { $in: ['AAPL', 'MSFT'] } }],
        });
    });

    it('inserts the bars not stored yet and leaves the stored ones alone', async () => {
        db.current = fakeDb({ [COLLECTION]: [{ tickerID: 'AAPL', timestamp: NINE_THIRTY }] });
        await expect(insertMissingBars(COLLECTION, [bar(), bar({ tickerID: 'MSFT' })])).resolves.toBe(1);

        expect(methodsOn(COLLECTION)).toEqual(['insertMany']);
        expect(db.current.of(COLLECTION).writes[0]?.args[0]).toEqual([bar({ tickerID: 'MSFT' })]);
    });

    it('writes nothing when every bar is already stored', async () => {
        db.current = fakeDb({ [COLLECTION]: [{ tickerID: 'AAPL', timestamp: NINE_THIRTY }] });
        await expect(insertMissingBars(COLLECTION, [bar()])).resolves.toBe(0);
        expect(db.current.of(COLLECTION).writes).toEqual([]);
    });
});
