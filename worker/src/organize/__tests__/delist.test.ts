import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnyBulkWriteOperation } from 'mongodb';
import type { AssetInfoDoc } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import type { Asset } from '@/organize/universe.js';

const db: { current: DbStub } = { current: fakeDb() };
const state: { written: AnyBulkWriteOperation<AssetInfoDoc>[] } = { written: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));
vi.mock('@/organize/write.js', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/organize/write.js')>();
    return {
        setOn: original.setOn,
        writeAssetInfo: (operations: AnyBulkWriteOperation<AssetInfoDoc>[]) => {
            state.written = operations;
            return Promise.resolve();
        },
    };
});

const { markDelisted, stillListed } = await import('@/organize/delist.js');
const { config } = await import('@/lib/config.js');

function asset(symbol: string): Asset {
    return {
        symbol,
        assetType: 'Stock',
        exchange: 'NASDAQ',
        sector: '',
        industry: '',
        marketCap: null,
        sharesOutstanding: null,
        ipo: null,
    };
}

beforeEach(() => {
    db.current = fakeDb();
    state.written = [];
});

describe('markDelisted', () => {
    it('treats a symbol with a recent bar as still trading', async () => {
        db.current = fakeDb({ OHCLVData: [{ _id: 'AAPL', latest: new Date() }] });
        await expect(markDelisted([asset('AAPL')])).resolves.toEqual([]);
        expect(state.written).toEqual([]);
    });

    it('marks a symbol the aggregation did not return', async () => {
        db.current = fakeDb({ OHCLVData: [{ _id: 'AAPL', latest: new Date() }] });
        await expect(markDelisted([asset('AAPL'), asset('GONE')])).resolves.toEqual(['GONE']);
    });

    it('clears the relative-strength scores alongside the flag — a delisted symbol should not rank', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        await markDelisted([asset('GONE')]);
        expect(state.written).toEqual([
            {
                updateOne: {
                    filter: { Symbol: 'GONE' },
                    update: {
                        $set: { Delisted: true, RSScore1W: null, RSScore1M: null, RSScore4M: null },
                    },
                },
            },
        ]);
    });

    it('cuts off at the configured number of days rather than at the last bar', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        const before = Date.now();
        await markDelisted([]);
        const pipeline = db.current.of('OHCLVData').filters[0] as { $match?: { latest: { $gte: Date } } }[];
        const cutoff = pipeline[1]?.$match?.latest.$gte as Date;
        const expected = before - config.organize.delistAfterDays * 86_400_000;
        expect(Math.abs(cutoff.getTime() - expected)).toBeLessThan(5_000);
    });

    it('allows disk use — the grouping walks every daily bar', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        await markDelisted([]);
        expect(db.current.of('OHCLVData').aggregate).toHaveBeenCalledWith(expect.anything(), { allowDiskUse: true });
    });
});

describe('stillListed', () => {
    it('removes exactly the symbols just marked', () => {
        const universe = [asset('AAPL'), asset('GONE'), asset('MSFT')];
        expect(stillListed(universe, ['GONE']).map((one) => one.symbol)).toEqual(['AAPL', 'MSFT']);
    });

    it('returns the universe untouched when nothing was delisted', () => {
        const universe = [asset('AAPL')];
        expect(stillListed(universe, [])).toEqual(universe);
    });

    it('ignores a delisted symbol that was never in the universe', () => {
        expect(stillListed([asset('AAPL')], ['NEVER'])).toHaveLength(1);
    });
});
