/**
 * Reshapes the dividends and splits stored on each asset into the one shape the
 * rebuilt code reads and writes: `{ date, amount }` and `{ date, ratio }`, with
 * `date` as `YYYY-MM-DD`.
 * The Python stored the vendor's own names — `{ payment_date, amount }` and
 * `{ effective_date, split_factor }`, both dates as BSON Dates at UTC midnight —
 * so every chart that asked for its event markers got a 500, and every
 * portfolio replay found no dividend it could date and credited none.
 * The same pass leaves each array ascending and one row per date. The chart
 * reads the newest rows off the end, which a handful of assets had out of
 * order; and the nightly run guards its writes on the date, which a run that
 * landed twice had already got past — over a thousand assets carry a dividend
 * twice, and a replay would have paid it twice. Every duplicate agrees on its
 * amount or factor, so which copy survives costs nothing.
 * Idempotent: only an asset still carrying an old field is read, and a rewritten
 * one carries none, so a second run — or a run against a database that only
 * ever held new data — touches nothing.
 */

/** Stored array → the old field holding its date, the old field holding its value, and the value's new name. */
const RESHAPES = {
    dividends: { date: 'payment_date', value: 'amount', as: 'amount' },
    splits: { date: 'effective_date', value: 'split_factor', as: 'ratio' },
};

/** Writes sent per round trip; some eighteen thousand assets need one. */
const BATCH_SIZE = 1000;

/** @public — invoked by the migrate-mongo CLI, never imported. */
export async function up(db) {
    const present = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name));
    if (!present.has('AssetInfo')) return;

    const assets = db.collection('AssetInfo');
    const filter = { $or: Object.entries(RESHAPES).map(([field, old]) => ({ [`${field}.${old.date}`]: { $exists: true } })) };
    const projection = Object.fromEntries(Object.keys(RESHAPES).map((field) => [field, 1]));

    let writes = [];
    let reshaped = 0;

    for await (const asset of assets.find(filter, { projection })) {
        const $set = {};
        for (const [field, old] of Object.entries(RESHAPES)) {
            if (Array.isArray(asset[field])) $set[field] = reshape(asset[field], old);
        }

        writes.push({ updateOne: { filter: { _id: asset._id }, update: { $set } } });
        if (writes.length < BATCH_SIZE) continue;
        reshaped += (await assets.bulkWrite(writes, { ordered: false })).modifiedCount;
        writes = [];
    }

    if (writes.length > 0) reshaped += (await assets.bulkWrite(writes, { ordered: false })).modifiedCount;
    if (reshaped > 0) console.log(`  Reshaped dividends and splits on ${reshaped} asset(s).`);
}

/**
 * One array in the new shape: ascending, one row per date.
 * A row already in the new shape passes through, so an asset the nightly run
 * appended to before this ran keeps what it was given.
 */
function reshape(rows, old) {
    const byDate = new Map();

    for (const row of rows) {
        const action = row[old.date] instanceof Date ? { date: row[old.date].toISOString().slice(0, 10), [old.as]: row[old.value] } : row;
        if (!byDate.has(action.date)) byDate.set(action.date, action);
    }

    return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
