/**
 * The collection registry and the index manifest — the ONE place a MongoDB
 * collection name or index is declared.
 * `ensureIndexes()` in api/src/lib/db.ts applies the index manifest at startup.
 * `createIndex` is a no-op when the index already exists, so replicas racing at
 * boot is harmless. Adding an index means adding an entry here; it is created on
 * the next boot in every environment. Dropping one is a migration, never a change
 * here — a drop applied at boot re-runs on every restart.
 * Three index manifests, because three writers own them. `INDEXES` is applied by
 * the API at startup and covers the collections the API writes. `OHLCV_INDEXES`
 * and `REFERENCE_INDEXES` are applied by the worker, which is the only writer of
 * the candle, reference and derived collections; the API only reads them.
 * No candle index is unique. The aggregator role is a singleton and upserts on
 * exactly this key, so it cannot produce a duplicate — while the existing
 * collections predate the constraint, and a `createIndex` that failed on old
 * data would stop the service booting rather than surface as a warning. The
 * reference indexes that ARE unique are applied the same way: the worker logs
 * the one that would not build and carries on, because a night of prices is
 * worth more than a constraint that can be added once the data is cleaned.
 * This module imports nothing at runtime, and must not start: `db/migrations/`
 * runs as plain `.js` under the migrate-mongo CLI and imports `ALL_COLLECTIONS`
 * from here, so anything it pulls in at runtime has to resolve without a
 * bundler. A type-only import is erased and therefore free.
 */
import type { ChartTimeframe } from '#db/collections.js';

export type IndexSpec = {
    collection: string;
    keys: Record<string, 1 | -1>;
    options?: {
        unique?: boolean; // Reject duplicate keys
        sparse?: boolean; // Only index documents where the key exists — for optional unique fields
        expireAfterSeconds?: number; // TTL: delete the document this many seconds after the indexed date. `0` = at the date itself
        partialFilterExpression?: Record<string, unknown>; // Only index matching documents — keeps the index small and sidesteps null-uniqueness
    };
    why: string; // Which query or constraint this index serves
};

/** Every collection the API owns. Market-data collections are not listed — the API only reads them. */
export const COLLECTIONS = [
    'Users',
    'RefreshTokens',
    'Screeners',
    'Watchlists',
    'Portfolios',
    'Positions',
    'Trades',
    'Notes',
    'ChartDrawings',
] as const;

/**
 * The candle collections, one per chart timeframe.
 * The names are the ingestor's, misspelling included, and are load-bearing —
 * they address the collections a decade of bars already live in.
 */
export const OHLCV_COLLECTIONS = {
    daily: 'OHCLVData',
    weekly: 'OHCLVData2',
    intraday1m: 'OHCLVData1m',
    intraday5m: 'OHCLVData5m',
    intraday15m: 'OHCLVData15m',
    intraday30m: 'OHCLVData30m',
    intraday1hr: 'OHCLVData1hr',
} as const satisfies Record<ChartTimeframe, string>;

/** Reference and derived market data, written by the worker's nightly run. */
export const REFERENCE_COLLECTIONS = ['AssetInfo', 'Stats'] as const;

/**
 * Every collection in EreunaDB. The bootstrap migration creates exactly these,
 * and the drift gate holds the docs and the examples to the same list, so a
 * collection that exists in the database and nowhere else has one place to be
 * caught.
 */
export const ALL_COLLECTIONS: readonly string[] = [
    ...COLLECTIONS,
    ...Object.values(OHLCV_COLLECTIONS),
    ...REFERENCE_COLLECTIONS,
];

export const INDEXES: IndexSpec[] = [
    {
        collection: 'Users',
        keys: { usernameLower: 1 },
        options: { unique: true },
        why: 'Case-insensitive login lookup and username uniqueness, as an equality match rather than a $regex scan.',
    },
    {
        collection: 'RefreshTokens',
        keys: { tokenHash: 1 },
        options: { unique: true },
        why: 'Rotation claims a token by its hash; uniqueness stops two records sharing one token.',
    },
    {
        collection: 'RefreshTokens',
        keys: { familyId: 1 },
        why: 'Reuse detection revokes an entire token family in one delete.',
    },
    {
        collection: 'RefreshTokens',
        keys: { userId: 1 },
        why: 'Password change and account deletion revoke every session for a user.',
    },
    {
        collection: 'RefreshTokens',
        keys: { expiresAt: 1 },
        options: { expireAfterSeconds: 0 },
        why: 'TTL: expired and rotated-out token records purge themselves at their ceiling.',
    },
    {
        collection: 'Screeners',
        keys: { userId: 1, nameLower: 1 },
        options: { unique: true },
        why: 'Every screener read is scoped to the owner; uniqueness stops two screeners sharing a name per user.',
    },
    {
        collection: 'Screeners',
        keys: { userId: 1, include: 1 },
        why: 'Combined results query only the screeners a user has switched on.',
    },
    {
        collection: 'Watchlists',
        keys: { userId: 1, nameLower: 1 },
        options: { unique: true },
        why: 'Watchlist lookup by owner and name; uniqueness per user.',
    },
    {
        collection: 'Watchlists',
        keys: { userId: 1, position: 1 },
        why: 'Listing a user’s watchlists in their saved order without an in-memory sort.',
    },
    {
        collection: 'Portfolios',
        keys: { userId: 1, number: 1 },
        options: { unique: true },
        why: 'A user has one document per portfolio slot; every portfolio read is (owner, slot).',
    },
    {
        collection: 'Positions',
        keys: { userId: 1, portfolioNumber: 1, symbol: 1 },
        options: { unique: true },
        why: 'One position per symbol per portfolio — the upsert key for every buy and sell.',
    },
    {
        collection: 'Trades',
        keys: { userId: 1, portfolioNumber: 1, tradeDate: -1 },
        why: 'The trade blotter: equality on owner and slot, range and sort on date.',
    },
    {
        collection: 'Trades',
        keys: { userId: 1, portfolioNumber: 1, symbol: 1, tradeDate: 1 },
        why: 'Per-symbol trade history, which drives realised P/L and hold-time stats.',
    },
    {
        collection: 'Notes',
        keys: { userId: 1, symbol: 1, createdAt: -1 },
        why: 'Notes are listed newest-first for one symbol and one owner.',
    },
    {
        collection: 'Notes',
        keys: { userId: 1, createdAt: -1 },
        why: 'The unfiltered notes listing, which spans every symbol a user has written about.',
    },
    {
        collection: 'ChartDrawings',
        keys: { userId: 1, symbol: 1, timeframe: 1 },
        options: { unique: true },
        why: 'One drawing document per (owner, symbol, timeframe) — the upsert key when a chart saves.',
    },
];

/**
 * The candle collections, applied by the aggregator.
 * One compound index per timeframe serves both writers and readers: the
 * aggregator's upsert filters on exactly this key, and every chart read is
 * "the last N bars of one symbol".
 * `timestamp` is ascending even though every read is newest-first. `tickerID`
 * is an equality match, so the sort is on `timestamp` alone and MongoDB walks
 * the index backwards for it at the same cost — a descending copy would serve
 * no query the ascending one does not, while costing an index build over half a
 * billion existing bars.
 */
export const OHLCV_INDEXES: IndexSpec[] = Object.values(OHLCV_COLLECTIONS).map((collection) => ({
    collection,
    keys: { tickerID: 1, timestamp: 1 },
    why: 'Aggregator upserts by (tickerID, timestamp); chart reads walk it backwards for the last N bars',
}));

/**
 * The reference and derived collections, applied by the worker's nightly run.
 * `AssetInfo.Symbol` is unique because every job in that run addresses a symbol
 * by it and a duplicate would mean half the night's figures landing on one copy
 * and half on the other. `Stats` is addressed by `_id` alone and needs nothing
 * declared here.
 */
export const REFERENCE_INDEXES: IndexSpec[] = [
    {
        collection: 'AssetInfo',
        keys: { Symbol: 1 },
        options: { unique: true },
        why: 'Every nightly job and every market read addresses an asset by symbol.',
    },
];
