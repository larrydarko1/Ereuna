/**
 * The index manifest — the ONE place any MongoDB index is declared.
 * `ensureIndexes()` in api/src/lib/db.ts applies this at startup. `createIndex`
 * is a no-op when the index already exists, so replicas racing at boot is
 * harmless. Adding an index means adding an entry here; it is created on the
 * next boot in every environment. Dropping one is a migration, never a change
 * here — a drop applied at boot re-runs on every restart.
 * Market-data collections (AssetInfo, OHCLVData*, News, Calendar) are owned by
 * the Python ingestor and aggregator and index themselves. Only the read paths
 * the API depends on appear below.
 */

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
    'systemSettings',
] as const;

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
        collection: 'ChartDrawings',
        keys: { userId: 1, symbol: 1, timeframe: 1 },
        options: { unique: true },
        why: 'One drawing document per (owner, symbol, timeframe) — the upsert key when a chart saves.',
    },
    {
        collection: 'systemSettings',
        keys: { key: 1 },
        options: { unique: true },
        why: 'Settings are read by key; there is exactly one document per key.',
    },
];
