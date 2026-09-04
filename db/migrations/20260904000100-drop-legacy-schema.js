/**
 * Drops what the rebuild left behind: ten collections nothing reads any more,
 * the documents still written in the pre-rebuild shape, and the indexes that
 * served queries no longer issued.
 * This runs once against the one database that predates the rewrite. There is
 * no data to preserve — the app never reached production and has no users — so
 * the legacy rows are removed rather than migrated. What makes that safe to run
 * repeatedly, and safe to run against a database that only ever held new data,
 * is that every deletion is keyed on the ABSENCE of a field the current shape
 * always carries: a document written by today's code can never match.
 */
/**
 * Collections the rebuild removed outright. Nothing in any workspace reads them.
 * The second group is the failed startup's: billing, and two market datasets no
 * screen or endpoint ever asked for. `CallTranscripts` alone is 4.1 GB, which is
 * why it is dropped rather than left in place against a feature that may never
 * be written.
 */
const DEAD_COLLECTIONS = [
    'Agents',
    'Alerts',
    'Docs',
    'FinancialUpdatesProgress',
    'systemSettings',
    'CallTranscripts',
    'InsiderTransactions',
    'Receipts',
    'Refunds',
    'DownloadTokens',
];

/**
 * Collection → the field every current document has and no legacy one did.
 * `Users` moved from `Username` to a `usernameLower` login key; everything else
 * moved from a `UsernameID` string to a `userId` ObjectId.
 */
const LEGACY_MARKER = {
    Users: 'usernameLower',
    Screeners: 'userId',
    Watchlists: 'userId',
    Portfolios: 'userId',
    Positions: 'userId',
    Trades: 'userId',
    Notes: 'userId',
    ChartDrawings: 'userId',
};

/**
 * Indexes on the database that the manifest does not declare.
 * The `AssetInfo` ones are all prefixed on `Delisted`, which the rebuilt
 * screener never filters on — it builds its query from the filter registry
 * alone — so they cost every write and serve no read.
 */
const DEAD_INDEXES = {
    AssetInfo: [
        'idx_delisted_symbol',
        'idx_delisted_sector_exchange',
        'idx_delisted_assettype',
        'idx_delisted_assettype_exchange',
        'idx_delisted_industry_exchange',
        'idx_delisted_exchange',
        'idx_delisted_country',
        'idx_delisted_marketcap',
        'idx_delisted_peratio',
        'idx_delisted_rsscore1m',
        'idx_delisted_rsscore4m',
        'idx_delisted_eps',
        'idx_delisted_ipo',
        'idx_delisted_fundfamily',
        'idx_delisted_fundcategory',
        'idx_qf_roe',
        'idx_qf_roa',
        'idx_assettype_intrinsic_exchange',
    ],
    // Superseded by the manifest's `{ usernameLower: 1 }` unique index — the old
    // one was case-sensitive, so it never enforced what login actually needs.
    Users: ['idx_username'],
    // Superseded by `(userId, nameLower)` and `(userId, include)`.
    Screeners: ['idx_usernameid_name', 'idx_usernameid_include'],
    // Both keyed on the `Username` string the rebuild replaced with a `userId`
    // ObjectId, so neither can serve a query the current code issues.
    Positions: ['Username_1_PortfolioNumber_1_Symbol_1'],
    Trades: ['Username_1_PortfolioNumber_1_Symbol_1_Date_1'],
    // The calendar was rebuilt around one row per (reportDate, type, symbol).
    // `eventDate` and `eventType` are fields no document carries any more, and
    // the rest are prefixes of the manifest's compound index.
    Calendar: [
        'symbol_1_reportDate_1',
        'reportDate_1',
        'type_1',
        'symbol_1_eventType_1',
        'eventDate_1',
        'symbol_1_eventDate_1',
    ],
    // Every chart read is scoped to one symbol, so a bare date index is never chosen.
    OHCLVData: ['idx_timestamp_desc', 'idx_tickerid_timestamp_desc'],
    // A descending twin of the ascending index the manifest declares. `tickerID`
    // is an equality match, so the ascending one already serves a newest-first
    // sort by being walked backwards; this one only costs writes.
    OHCLVData1m: ['idx_tickerid_timestamp_desc'],
};

/** @public — invoked by the migrate-mongo CLI, never imported. */
export async function up(db) {
    // Asked before every drop rather than caught after one: the driver answers
    // a drop of something that does not exist with success, not an error, so a
    // migration that leans on the catch reports work it never did.
    const present = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name));

    for (const name of DEAD_COLLECTIONS) {
        if (!present.has(name)) continue;
        await db.collection(name).drop();
        console.log(`  Dropped collection ${name}.`);
    }

    for (const [name, marker] of Object.entries(LEGACY_MARKER)) {
        if (!present.has(name)) continue;
        const { deletedCount } = await db.collection(name).deleteMany({ [marker]: { $exists: false } });
        if (deletedCount > 0) console.log(`  Removed ${deletedCount} pre-rebuild document(s) from ${name}.`);
    }

    for (const [name, names] of Object.entries(DEAD_INDEXES)) {
        if (!present.has(name)) continue;
        const existing = new Set((await db.collection(name).indexes()).map((index) => index.name));

        for (const index of names) {
            if (!existing.has(index)) continue;
            await db.collection(name).dropIndex(index);
            console.log(`  Dropped index ${name}.${index}.`);
        }
    }
}
