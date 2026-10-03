import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isList } from '@ereuna/shared';

import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import { at, dateAt, listAt } from '@/__tests__/support/values.js';

const db: { current: DbStub } = { current: fakeDb() };
vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const logged: { errors: unknown[] } = { errors: [] };
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

const { rebuildWeekly, updateCurrentWeek } = await import('@/organize/weekly.js');
const { config } = await import('@/lib/config.js');

/** One grouped row as the pipeline hands it back. */
function grouped(tickerID: string, week: Date): Record<string, unknown> {
    return { _id: { tickerID, week }, open: 100, high: 110, low: 90, close: 105, volume: 5_000 };
}

const pipelineOf = (): unknown[] => {
    const stages = db.current.of('OHCLVData').filters[0];
    return isList(stages) ? stages : [];
};

/** Every bulk operation written to `collection`, across all its bulk writes. */
const opsOn = (collection: string): unknown[] =>
    db.current
        .of(collection)
        .writes.filter((write) => write.method === 'bulkWrite')
        .flatMap((write) => listAt(write.args, 0));

beforeEach(() => {
    db.current = fakeDb();
    logged.errors = [];
});

describe('updateCurrentWeek', () => {
    it('matches only bars from the Monday the week started on', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        // A Thursday
        await updateCurrentWeek(Date.UTC(2026, 8, 3, 15, 0, 0));
        const from = dateAt(pipelineOf(), 0, '$match', 'timestamp', '$gte');
        expect(from.getUTCDay()).toBe(1);
        expect(from).toEqual(new Date(Date.UTC(2026, 7, 31)));
    });

    it('groups on a Monday-start week, the same rule the aggregator buckets by', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        await updateCurrentWeek(Date.UTC(2026, 8, 3));
        expect(at(pipelineOf(), 2, '$group', '_id', 'week', '$dateTrunc')).toMatchObject({
            unit: 'week',
            startOfWeek: 'monday',
        });
    });

    it('opens on the first bar and closes on the last, taking the extremes between', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        await updateCurrentWeek();
        expect(at(pipelineOf(), 2, '$group')).toMatchObject({
            open: { $first: '$open' },
            high: { $max: '$high' },
            low: { $min: '$low' },
            close: { $last: '$close' },
            volume: { $sum: '$volume' },
        });
    });

    it('upserts each week rather than deleting, so a second run in the week corrects the bar', async () => {
        const week = new Date(Date.UTC(2026, 7, 31));
        db.current = fakeDb({ OHCLVData: [grouped('AAPL', week)] });
        await expect(updateCurrentWeek()).resolves.toBe(1);

        const [operation] = opsOn('OHCLVData2');
        expect(at(operation, 'updateOne', 'upsert')).toBe(true);
        expect(at(operation, 'updateOne', 'filter')).toEqual({ tickerID: 'AAPL', timestamp: week });
        expect(at(operation, 'updateOne', 'update', '$set')).toEqual({
            tickerID: 'AAPL',
            timestamp: week,
            open: 100,
            high: 110,
            low: 90,
            close: 105,
            volume: 5_000,
        });
        expect(db.current.of('OHCLVData2').writes.some((write) => write.method === 'deleteMany')).toBe(false);
    });

    it('writes nothing when the week produced no bars', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        await expect(updateCurrentWeek()).resolves.toBe(0);
        expect(db.current.of('OHCLVData2').writes).toEqual([]);
    });

    it('batches the upserts and logs a batch that fails', async () => {
        const size = config.organize.writeBatchSize;
        const rows = Array.from({ length: size + 1 }, (_unused, index) =>
            grouped(`S${index}`, new Date(Date.UTC(2026, 7, 31))),
        );
        db.current = fakeDb({ OHCLVData: rows });
        db.current.of('OHCLVData2').bulkWrite.mockRejectedValueOnce(new Error('write conflict'));

        await expect(updateCurrentWeek()).resolves.toBe(size + 1);
        expect(db.current.of('OHCLVData2').bulkWrite).toHaveBeenCalledTimes(2);
        expect(logged.errors).toHaveLength(1);
    });
});

describe('rebuildWeekly', () => {
    it("matches one symbol's whole history", async () => {
        db.current = fakeDb({ OHCLVData: [] });
        await rebuildWeekly('AAPL');
        expect(at(pipelineOf(), 0, '$match')).toEqual({ tickerID: 'AAPL' });
    });

    it("clears the symbol's weekly bars before writing the replacements", async () => {
        db.current = fakeDb({ OHCLVData: [grouped('AAPL', new Date(Date.UTC(2026, 7, 31)))] });
        await expect(rebuildWeekly('AAPL')).resolves.toBe(1);

        const writes = db.current.of('OHCLVData2').writes;
        expect(writes[0]?.method).toBe('deleteMany');
        expect(writes[0]?.args[0]).toEqual({ tickerID: 'AAPL' });
        expect(writes[1]?.method).toBe('bulkWrite');
    });

    it('still clears the old bars when the rebuild produces none', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        await expect(rebuildWeekly('AAPL')).resolves.toBe(0);
        expect(db.current.of('OHCLVData2').writes.map((write) => write.method)).toEqual(['deleteMany']);
    });
});
