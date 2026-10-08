/**
 * Replaces every NaN stored in the financial statements with null.
 * The Python wrote a ratio it could not compute — a margin on zero revenue, a
 * current ratio on zero liabilities — as NaN, and some 2,300 of them sit in the
 * `quarterlyFinancials` and `AnnualFinancials` rows of about three hundred
 * assets. BSON calls NaN a number, so the screener's bounds aggregation let it
 * through and `$min` ranked it below every real value: three filters' lower
 * bound came back NaN and the whole filter catalogue failed with them.
 * Null is what every reader already makes of it — each one goes through
 * `numeric()` — and the rebuilt worker cannot write NaN: the vendor's values are
 * parsed by a schema that refuses one, and its own arithmetic rounds through a
 * helper that answers null for anything non-finite.
 * Idempotent: only an asset still holding a non-finite figure is written, so a
 * second run reads the statements and writes nothing.
 */

/** The statement arrays, each row a flat object of one period's figures. */
const STATEMENT_ARRAYS = ['quarterlyFinancials', 'AnnualFinancials'];

/** Writes sent per round trip. */
const BATCH_SIZE = 500;

/** @public — invoked by the migrate-mongo CLI, never imported. */
export async function up(db) {
    const present = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name));
    if (!present.has('AssetInfo')) return;

    const assets = db.collection('AssetInfo');
    const filter = { $or: STATEMENT_ARRAYS.map((field) => ({ [field]: { $exists: true } })) };
    const projection = Object.fromEntries(STATEMENT_ARRAYS.map((field) => [field, 1]));

    let writes = [];
    let cleaned = 0;
    let figures = 0;

    for await (const asset of assets.find(filter, { projection })) {
        const $set = {};

        for (const field of STATEMENT_ARRAYS) {
            if (!Array.isArray(asset[field])) continue;
            const { rows, replaced } = nullNonFinite(asset[field]);
            if (replaced === 0) continue;
            $set[field] = rows;
            figures += replaced;
        }

        if (Object.keys($set).length === 0) continue;
        writes.push({ updateOne: { filter: { _id: asset._id }, update: { $set } } });
        if (writes.length < BATCH_SIZE) continue;
        cleaned += (await assets.bulkWrite(writes, { ordered: false })).modifiedCount;
        writes = [];
    }

    if (writes.length > 0) cleaned += (await assets.bulkWrite(writes, { ordered: false })).modifiedCount;
    if (cleaned > 0) console.log(`  Nulled ${figures} non-finite statement figure(s) on ${cleaned} asset(s).`);
}

/** Each row with its non-finite numbers set to null, and how many there were. */
function nullNonFinite(rows) {
    let replaced = 0;

    const cleaned = rows.map((row) => {
        if (typeof row !== 'object' || row === null) return row;
        const entries = Object.entries(row).map(([key, value]) => {
            if (typeof value !== 'number' || Number.isFinite(value)) return [key, value];
            replaced += 1;
            return [key, null];
        });
        return Object.fromEntries(entries);
    });

    return { rows: cleaned, replaced };
}
