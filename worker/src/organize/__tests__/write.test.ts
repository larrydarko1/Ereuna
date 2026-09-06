import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

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

const { assetInfoUpdates, setOn, writeAssetInfo } = await import('@/organize/write.js');
const { config } = await import('@/lib/config.js');

beforeEach(() => {
    db.current = fakeDb();
    logged.errors = [];
});

describe('setOn', () => {
    it('builds an updateOne that sets the fields on one symbol', () => {
        expect(setOn('AAPL', { RSI: 55 })).toEqual({
            updateOne: { filter: { Symbol: 'AAPL' }, update: { $set: { RSI: 55 } } },
        });
    });

    it('sets nothing when handed nothing, rather than clearing the document', () => {
        expect(setOn('AAPL', {})).toEqual({
            updateOne: { filter: { Symbol: 'AAPL' }, update: { $set: {} } },
        });
    });
});

describe('writeAssetInfo', () => {
    it('does not touch the database for an empty operation list', async () => {
        await writeAssetInfo([]);
        expect(db.current.collection).not.toHaveBeenCalled();
    });

    it('writes unordered — one rejected operation must not abandon the rest of the batch', async () => {
        await writeAssetInfo([setOn('AAPL', { RSI: 55 })]);
        expect(db.current.of('AssetInfo').writes[0]?.args[1]).toEqual({ ordered: false });
    });

    it('splits the operations into batches of the configured size', async () => {
        const size = config.organize.writeBatchSize;
        const operations = Array.from({ length: size + 1 }, (_unused, index) => setOn(`S${index}`, { RSI: index }));
        await writeAssetInfo(operations);

        const writes = db.current.of('AssetInfo').writes;
        expect(writes).toHaveLength(2);
        expect((writes[0]?.args[0] as unknown[]).length).toBe(size);
        expect((writes[1]?.args[0] as unknown[]).length).toBe(1);
    });

    it('logs a failed batch and keeps going — a night of prices is worth more than one batch', async () => {
        db.current = fakeDb();
        const collection = db.current.of('AssetInfo');
        collection.bulkWrite.mockRejectedValueOnce(new Error('write conflict'));

        const size = config.organize.writeBatchSize;
        const operations = Array.from({ length: size + 1 }, (_unused, index) => setOn(`S${index}`, { RSI: index }));
        await expect(writeAssetInfo(operations)).resolves.toBeUndefined();

        expect(logged.errors).toHaveLength(1);
        expect(collection.bulkWrite).toHaveBeenCalledTimes(2);
    });
});

describe('assetInfoUpdates', () => {
    it('hands back the AssetInfo collection for the operators the doc type cannot express', () => {
        expect(assetInfoUpdates()).toBe(db.current.of('AssetInfo'));
    });
});
