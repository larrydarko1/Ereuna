import { describe, expect, it } from 'vitest';
import {
    ALL_COLLECTIONS,
    COLLECTIONS,
    INDEXES,
    OHLCV_COLLECTIONS,
    OHLCV_INDEXES,
    REFERENCE_INDEXES,
    type IndexSpec,
} from '#db/indexes.js';

const ALL_INDEXES = [...INDEXES, ...OHLCV_INDEXES, ...REFERENCE_INDEXES];

const signature = (spec: IndexSpec): string => `${spec.collection}:${JSON.stringify(spec.keys)}`;

describe('the collection registry', () => {
    it('lists every collection exactly once', () => {
        expect(new Set(ALL_COLLECTIONS).size).toBe(ALL_COLLECTIONS.length);
    });

    /**
     * The names are written out rather than rebuilt from the same three groups
     * the registry composes: an assertion assembled from its own subject agrees
     * with a rename as readily as with the truth. Eighteen namespaces hold every
     * byte in EreunaDB, so adding or renaming one is a deliberate act that
     * belongs in a diff.
     */
    it('names the eighteen collections EreunaDB holds, in writer order', () => {
        expect(ALL_COLLECTIONS).toEqual([
            'Users',
            'RefreshTokens',
            'Screeners',
            'Watchlists',
            'Portfolios',
            'Positions',
            'Trades',
            'Notes',
            'ChartDrawings',
            'OHCLVData',
            'OHCLVData2',
            'OHCLVData1m',
            'OHCLVData5m',
            'OHCLVData15m',
            'OHCLVData30m',
            'OHCLVData1hr',
            'AssetInfo',
            'Stats',
        ]);
    });

    /**
     * The split by writer is what check-db-drift.mjs reads to decide which
     * manifest may index which namespace. A market-data collection that drifted
     * into the API's group would let the API apply an index to half a billion
     * bars at boot.
     */
    it('keeps the API-owned group clear of the collections the worker writes', () => {
        const marketData = new Set<string>([...Object.values(OHLCV_COLLECTIONS), 'AssetInfo', 'Stats']);
        for (const name of COLLECTIONS) expect(marketData.has(name)).toBe(false);
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
