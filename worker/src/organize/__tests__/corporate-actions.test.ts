import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INTRADAY_COLLECTIONS } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const calls: { refetched: [string, unknown[]][]; rebuilt: string[]; history: Record<string, unknown>[] } = {
    refetched: [],
    rebuilt: [],
    history: [],
};
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
vi.mock('@/lib/tiingo.js', () => ({ dailyHistory: () => Promise.resolve(calls.history) }));
vi.mock('@/organize/prices.js', () => ({
    refetchHistory: (symbol: string, history: unknown[]) => {
        calls.refetched.push([symbol, history]);
        return Promise.resolve(history.length);
    },
}));
vi.mock('@/organize/weekly.js', () => ({
    rebuildWeekly: (symbol: string) => {
        calls.rebuilt.push(symbol);
        return Promise.resolve(0);
    },
}));
vi.mock('@/organize/write.js', () => ({ assetInfoUpdates: () => db.current.of('AssetInfo') }));

const { applyDividends, applySplits } = await import('@/organize/corporate-actions.js');

const AT = new Date('2026-09-04T00:00:00.000Z');

/** `modifiedCount` decides whether the expensive repair runs, so it is the knob every test turns. */
function assetInfoModifies(count: number): void {
    db.current.of('AssetInfo').results.updateOne = {
        acknowledged: true,
        matchedCount: count,
        modifiedCount: count,
        upsertedCount: 0,
    };
}

beforeEach(() => {
    db.current = fakeDb();
    calls.refetched = [];
    calls.rebuilt = [];
    calls.history = [{ date: '2026-09-04' }];
    logged.errors = [];
});

describe('applySplits', () => {
    it('does nothing for an empty list', async () => {
        await expect(applySplits([])).resolves.toBe(0);
    });

    it('appends the split and multiplies the share count by the factor', async () => {
        assetInfoModifies(1);
        await applySplits([{ symbol: 'AAPL', at: AT, factor: 4 }]);

        const [write] = db.current.of('AssetInfo').writes;
        expect(write?.args[0]).toEqual({ 'Symbol': 'AAPL', 'splits.date': { $ne: '2026-09-04' } });
        expect(write?.args[1]).toEqual({
            $push: { splits: { date: '2026-09-04', ratio: 4 } },
            $mul: { SharesOutstanding: 4 },
        });
    });

    it('divides the share count for a reverse split, because the factor arrives below one', async () => {
        assetInfoModifies(1);
        await applySplits([{ symbol: 'AAPL', at: AT, factor: 0.1 }]);
        expect(db.current.of('AssetInfo').writes[0]?.args[1]).toMatchObject({
            $mul: { SharesOutstanding: 0.1 },
        });
    });

    it('refetches the history and rebuilds the weekly bars once the split is recorded', async () => {
        assetInfoModifies(1);
        await expect(applySplits([{ symbol: 'AAPL', at: AT, factor: 4 }])).resolves.toBe(1);
        expect(calls.refetched).toEqual([['AAPL', calls.history]]);
        expect(calls.rebuilt).toEqual(['AAPL']);
    });

    it('skips the whole repair when the document already carries the split', async () => {
        assetInfoModifies(0);
        await expect(applySplits([{ symbol: 'AAPL', at: AT, factor: 4 }])).resolves.toBe(0);
        expect(calls.refetched).toEqual([]);
        expect(calls.rebuilt).toEqual([]);
    });

    it('restates the intraday bars in every intraday collection', async () => {
        assetInfoModifies(1);
        await applySplits([{ symbol: 'AAPL', at: AT, factor: 4 }]);

        for (const collection of INTRADAY_COLLECTIONS) {
            const [write] = db.current.of(collection).writes;
            expect(write?.method).toBe('updateMany');
            expect(write?.args[0]).toEqual({ tickerID: 'AAPL' });
            expect(write?.args[1]).toEqual([
                {
                    $set: {
                        open: { $divide: ['$open', 4] },
                        high: { $divide: ['$high', 4] },
                        low: { $divide: ['$low', 4] },
                        close: { $divide: ['$close', 4] },
                        volume: { $multiply: ['$volume', 4] },
                    },
                },
            ]);
        }
    });

    it.each([
        ['a non-finite factor', Number.NaN],
        ['a zero factor', 0],
        ['a negative factor', -2],
    ])('leaves the intraday bars alone for %s', async (_label, factor) => {
        assetInfoModifies(1);
        await applySplits([{ symbol: 'AAPL', at: AT, factor }]);
        const [collection] = INTRADAY_COLLECTIONS;
        expect(db.current.of(collection ?? '').writes).toEqual([]);
    });

    it('logs a split that threw and carries on to the next one', async () => {
        assetInfoModifies(1);
        db.current.of('AssetInfo').updateOne.mockRejectedValueOnce(new Error('write conflict'));
        await expect(
            applySplits([
                { symbol: 'BAD', at: AT, factor: 4 },
                { symbol: 'GOOD', at: AT, factor: 2 },
            ]),
        ).resolves.toBe(1);
        expect(logged.errors).toHaveLength(1);
        expect(calls.rebuilt).toEqual(['GOOD']);
    });

    it('applies splits one at a time — each refetch is a multi-decade download', async () => {
        assetInfoModifies(1);
        await applySplits([
            { symbol: 'A', at: AT, factor: 2 },
            { symbol: 'B', at: AT, factor: 2 },
        ]);
        expect(calls.rebuilt).toEqual(['A', 'B']);
    });
});

describe('applyDividends', () => {
    it('does nothing for an empty list', async () => {
        await expect(applyDividends([])).resolves.toBe(0);
    });

    it('appends the payment and dates the document, only when it is not already there', async () => {
        assetInfoModifies(1);
        await expect(applyDividends([{ symbol: 'AAPL', at: AT, amount: 0.25 }])).resolves.toBe(1);

        const [write] = db.current.of('AssetInfo').writes;
        expect(write?.args[0]).toEqual({ 'Symbol': 'AAPL', 'dividends.date': { $ne: '2026-09-04' } });
        expect(write?.args[1]).toEqual({
            $push: { dividends: { date: '2026-09-04', amount: 0.25 } },
            $set: { DividendDate: AT },
        });
    });

    it('counts only the payments that actually changed a document', async () => {
        assetInfoModifies(0);
        await expect(applyDividends([{ symbol: 'AAPL', at: AT, amount: 0.25 }])).resolves.toBe(0);
    });

    it('reduces the timestamp to a date, so one payment is one entry', async () => {
        assetInfoModifies(1);
        await applyDividends([{ symbol: 'AAPL', at: new Date('2026-09-04T18:30:00.000Z'), amount: 1 }]);
        expect(db.current.of('AssetInfo').writes[0]?.args[1]).toMatchObject({
            $push: { dividends: { date: '2026-09-04', amount: 1 } },
        });
    });
});
