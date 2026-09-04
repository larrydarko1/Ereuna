/**
 * Reshapes the market data the rebuild kept, so it matches the shape the
 * rebuilt code reads.
 * Three collections survived the rewrite with their contents intact and their
 * field names slightly behind: `News` stores the vendor's `description` under
 * the name the read path now calls `summary`, and `AssetInfo` and `News` both
 * hold duplicate rows that stop the manifest's unique indexes from building.
 * Every step is idempotent by construction — a rename of a field that is no
 * longer there matches nothing, and a dedupe of a collection with no duplicates
 * deletes nothing — so this is safe to re-run and safe against a database that
 * only ever held new data.
 */

/**
 * Vendor field → the name the read path serves.
 * `market-news.ts` projects `summary`; the Python stored the vendor's own
 * `description` verbatim, so every headline ever returned carried a null
 * summary. The rename is the fix for the stored rows; `organize/news.ts`
 * already writes the new name.
 */
const NEWS_RENAMES = { description: 'summary' };

/** Collection → the field whose duplicates block a unique index in the manifest. */
const DEDUPE_KEY = { AssetInfo: 'Symbol', News: 'url' };

/**
 * Indexes that exist under the manifest's own key but not its options, so
 * `createIndex` would raise `IndexOptionsConflict` at the worker's next boot
 * rather than upgrade them. Dropped here; the manifest rebuilds them unique.
 */
const CONFLICTING_INDEXES = { AssetInfo: ['Symbol_1'] };

/** @public — invoked by the migrate-mongo CLI, never imported. */
export async function up(db) {
    const present = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name));

    if (present.has('News')) {
        const filter = { $or: Object.keys(NEWS_RENAMES).map((field) => ({ [field]: { $exists: true } })) };
        const { modifiedCount } = await db.collection('News').updateMany(filter, { $rename: NEWS_RENAMES });
        if (modifiedCount > 0) console.log(`  Renamed fields on ${modifiedCount} News document(s).`);
    }

    for (const [name, key] of Object.entries(DEDUPE_KEY)) {
        if (!present.has(name)) continue;
        const removed = await dedupe(db, name, key);
        if (removed > 0) console.log(`  Removed ${removed} duplicate ${name} document(s) by ${key}.`);
    }

    // The calendar was rebuilt as one row per event. The old code kept its own
    // progress tracker in the same collection, which carries none of the three
    // fields the manifest's unique index is built on.
    if (present.has('Calendar')) {
        const { deletedCount } = await db.collection('Calendar').deleteMany({
            $or: [{ symbol: { $exists: false } }, { type: { $exists: false } }, { reportDate: { $exists: false } }],
        });
        if (deletedCount > 0) console.log(`  Removed ${deletedCount} non-event document(s) from Calendar.`);
    }

    for (const [name, names] of Object.entries(CONFLICTING_INDEXES)) {
        if (!present.has(name)) continue;
        const existing = new Set((await db.collection(name).indexes()).map((index) => index.name));

        for (const index of names) {
            if (!existing.has(index)) continue;
            await db.collection(name).dropIndex(index);
            console.log(`  Dropped index ${name}.${index}, superseded by its unique form.`);
        }
    }
}

/**
 * Keep one document per value of `key` and delete the rest.
 * The survivor is the one carrying the most fields, which is what separates a
 * real row from a stub: every `AssetInfo` collision is an equity or ETF of some
 * seventy fields against a crypto pair whose ticker was flattened into the same
 * string — `S/ETH` became `SETH` and landed on ProShares Short Ether ETF. On
 * `News` the duplicates are identical but for their `_id`, so any of them wins
 * and the rule costs nothing.
 */
async function dedupe(db, name, key) {
    const groups = await db
        .collection(name)
        .aggregate([{ $group: { _id: `$${key}`, ids: { $push: '$_id' } } }, { $match: { 'ids.1': { $exists: true } } }], {
            allowDiskUse: true,
        })
        .toArray();

    let removed = 0;

    for (const group of groups) {
        const documents = await db.collection(name).find({ _id: { $in: group.ids } }).toArray();
        documents.sort((a, b) => Object.keys(b).length - Object.keys(a).length);
        const losers = documents.slice(1).map((document) => document._id);
        const { deletedCount } = await db.collection(name).deleteMany({ _id: { $in: losers } });
        removed += deletedCount;
    }

    return removed;
}
