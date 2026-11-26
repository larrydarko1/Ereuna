import type { AnyBulkWriteOperation } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssetInfoDoc } from '@ereuna/shared';

import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';
import { dateAt } from '@/__tests__/support/values.js';
import type { Asset } from '@/organize/universe.js';

vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));
const db: { current: DbStub } = { current: fakeDb() };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
const state: { written: AnyBulkWriteOperation<AssetInfoDoc>[] } = { written: [] };
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

/** Symbols that all printed today: 19 of them make one retirement exactly 5% of a 20-symbol universe. */
function trading(count: number): { universe: Asset[]; bars: { _id: string; latest: Date }[] } {
    const universe = Array.from({ length: count }, (_, index) => asset(`T${index}`));
    return { universe, bars: universe.map((one) => ({ _id: one.symbol, latest: new Date() })) };
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
        const { universe, bars } = trading(19);
        db.current = fakeDb({ OHCLVData: bars });
        await expect(markDelisted([...universe, asset('GONE')])).resolves.toEqual(['GONE']);
    });

    it('clears the relative-strength scores alongside the flag — a delisted symbol should not rank', async () => {
        const { universe, bars } = trading(19);
        db.current = fakeDb({ OHCLVData: bars });
        await markDelisted([...universe, asset('GONE')]);
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
        const cutoff = dateAt(db.current.of('OHCLVData').filters, 0, 1, '$match', 'latest', '$gte');
        const expected = before - config.organize.delistAfterDays * 86_400_000;
        expect(Math.abs(cutoff.getTime() - expected)).toBeLessThan(5_000);
    });

    it('refuses, writing nothing, when the scan would retire more than the configured share', async () => {
        const { universe, bars } = trading(18);
        db.current = fakeDb({ OHCLVData: bars });
        await expect(markDelisted([...universe, asset('GONE'), asset('ALSO')])).rejects.toThrow(
            'Delisting scan refused: 2 of 20 symbols',
        );
        expect(state.written).toEqual([]);
    });

    it('refuses the whole universe going quiet — weeks of failed price updates look exactly like that', async () => {
        const { universe } = trading(20);
        db.current = fakeDb({ OHCLVData: [] });
        await expect(markDelisted(universe)).rejects.toThrow('Delisting scan refused: 20 of 20 symbols');
        expect(state.written).toEqual([]);
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
