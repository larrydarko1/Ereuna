import { describe, expect, it } from 'vitest';
import {
    ALL_COLLECTIONS,
    COLLECTIONS,
    INDEXES,
    OHLCV_COLLECTIONS,
    OHLCV_INDEXES,
    REFERENCE_COLLECTIONS,
    REFERENCE_INDEXES,
    type IndexSpec,
} from '#db/indexes.js';

const ALL_INDEXES = [...INDEXES, ...OHLCV_INDEXES, ...REFERENCE_INDEXES];

const signature = (spec: IndexSpec): string => `${spec.collection}:${JSON.stringify(spec.keys)}`;

describe('the collection registry', () => {
    it('lists every collection exactly once', () => {
        expect(new Set(ALL_COLLECTIONS).size).toBe(ALL_COLLECTIONS.length);
    });

    it('is the union of the three writer-owned groups', () => {
        expect(ALL_COLLECTIONS).toEqual([
            ...COLLECTIONS,
            ...Object.values(OHLCV_COLLECTIONS),
            ...REFERENCE_COLLECTIONS,
        ]);
    });

    it('has one candle collection per chart timeframe, all distinct', () => {
        const names = Object.values(OHLCV_COLLECTIONS);
        expect(names).toHaveLength(7);
        expect(new Set(names).size).toBe(7);
    });

    it('keeps the ingestor\'s misspelling, which is what the existing namespaces are called', () => {
        expect(OHLCV_COLLECTIONS.daily).toBe('OHCLVData');
        expect(OHLCV_COLLECTIONS.weekly).toBe('OHCLVData2');
    });
});

describe('the index manifests', () => {
    it('only names collections that exist in the registry', () => {
        for (const spec of ALL_INDEXES) expect(ALL_COLLECTIONS).toContain(spec.collection);
    });

    it('declares no index twice — a repeat is either dead or a rename that lost its old name', () => {
        const seen = ALL_INDEXES.map(signature);
        expect(new Set(seen).size).toBe(seen.length);
    });

    it('gives every index a non-empty `why`', () => {
        const unexplained = ALL_INDEXES.filter((spec) => spec.why.length <= 10).map(signature);

        expect(unexplained).toEqual([]);
    });

    it('gives every index at least one key, in a legal direction', () => {
        for (const spec of ALL_INDEXES) {
            const entries = Object.entries(spec.keys);
            expect({ index: signature(spec), keys: entries.length > 0 }).toEqual({
                index: signature(spec),
                keys: true,
            });
            for (const [, direction] of entries) expect([1, -1]).toContain(direction);
        }
    });

    it('splits the manifests by writer with no overlap', () => {
        const apiOwned = new Set(INDEXES.map((spec) => spec.collection));
        for (const spec of [...OHLCV_INDEXES, ...REFERENCE_INDEXES]) {
            expect(apiOwned.has(spec.collection)).toBe(false);
        }
    });
});

describe('the candle indexes', () => {
    it('covers every candle collection and nothing else', () => {
        expect(OHLCV_INDEXES.map((spec) => spec.collection)).toEqual(Object.values(OHLCV_COLLECTIONS));
    });

    it('is (tickerID, timestamp) ascending — MongoDB walks it backwards for the newest-first sort', () => {
        for (const spec of OHLCV_INDEXES) expect(spec.keys).toEqual({ tickerID: 1, timestamp: 1 });
    });

    it('is never unique — the collections predate the constraint and a failed build would stop the boot', () => {
        for (const spec of OHLCV_INDEXES) expect(spec.options?.unique).toBeUndefined();
    });
});

describe('the uniqueness constraints', () => {
    it.each([
        ['Users', { usernameLower: 1 }],
        ['RefreshTokens', { tokenHash: 1 }],
    ])('keeps %s unique on %o', (collection, keys) => {
        const spec = INDEXES.find((i) => i.collection === collection && signature(i) === `${collection}:${JSON.stringify(keys)}`);
        expect(spec?.options?.unique).toBe(true);
    });

    it('keeps AssetInfo.Symbol unique — it is the upsert key for the whole nightly run', () => {
        const symbol = REFERENCE_INDEXES.find((i) => i.collection === 'AssetInfo');
        expect(symbol?.options?.unique).toBe(true);
    });
});
