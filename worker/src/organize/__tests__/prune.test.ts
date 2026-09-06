import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INTRADAY_COLLECTIONS } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));

const { pruneIntraday } = await import('@/organize/prune.js');
const { config } = await import('@/lib/config.js');

beforeEach(() => {
    db.current = fakeDb();
});

describe('pruneIntraday', () => {
    it('deletes from every intraday collection and no other', async () => {
        await pruneIntraday();
        expect(db.current.collection.mock.calls.map(([name]) => name)).toEqual([...INTRADAY_COLLECTIONS]);
    });

    it('cuts off at the configured retention, measured from the instant it was given', async () => {
        const now = Date.UTC(2026, 8, 5, 12, 0, 0);
        await pruneIntraday(now);
        const [collection] = INTRADAY_COLLECTIONS;
        const filter = db.current.of(collection ?? '').writes[0]?.args[0] as { timestamp: { $lt: Date } };
        expect(filter.timestamp.$lt).toEqual(new Date(now - config.organize.intradayRetentionDays * 86_400_000));
    });

    it('sums the deletions across the collections', async () => {
        db.current = fakeDb();
        for (const collection of INTRADAY_COLLECTIONS) {
            db.current.of(collection).deleteMany.mockResolvedValue({ acknowledged: true, deletedCount: 3 });
        }
        await expect(pruneIntraday()).resolves.toBe(3 * INTRADAY_COLLECTIONS.length);
    });

    it('reports nothing removed when the collections are already inside retention', async () => {
        await expect(pruneIntraday()).resolves.toBe(0);
    });
});
