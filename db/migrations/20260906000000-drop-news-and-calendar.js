/**
 * Drops the headline and corporate-events datasets, and the discounted-cash-flow
 * field that fed the valuation panel.
 * The dashboard no longer carries a news feed or an events calendar, no route
 * serves either, and the nightly run no longer writes them — so `News` and
 * `Calendar` are namespaces nothing reads or refills. `AssetInfo.IntrinsicValue`
 * goes the same way: the valuation step that produced it is gone, so every copy
 * still on an asset is a figure that can only get staler.
 * The trading-hours calendar is untouched. That is `Stats._id: 'Holidays'`,
 * written by a different step and read by the market clock and the ingestor.
 * Idempotent: the collections are checked for before they are dropped, and the
 * field unset matches only documents that still carry it.
 */

/** Namespaces the removal left with no writer and no reader. */
const DEAD_COLLECTIONS = ['News', 'Calendar'];

/** @public — invoked by the migrate-mongo CLI, never imported. */
export async function up(db) {
    // Asked before the drop rather than caught after it: the driver answers a
    // drop of a missing collection with success, so a migration that leans on
    // the catch reports work it never did.
    const present = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name));

    for (const name of DEAD_COLLECTIONS) {
        if (!present.has(name)) continue;
        await db.collection(name).drop();
        console.log(`  Dropped collection ${name}.`);
    }

    if (present.has('AssetInfo')) {
        const { modifiedCount } = await db
            .collection('AssetInfo')
            .updateMany({ IntrinsicValue: { $exists: true } }, { $unset: { IntrinsicValue: '' } });
        if (modifiedCount > 0) console.log(`  Cleared IntrinsicValue from ${modifiedCount} asset(s).`);
    }

    if (present.has('Stats')) {
        const { modifiedCount } = await db
            .collection('Stats')
            .updateMany(
                { $or: [{ top10Undervalued: { $exists: true } }, { top10Overvalued: { $exists: true } }] },
                { $unset: { top10Undervalued: '', top10Overvalued: '' } },
            );
        if (modifiedCount > 0) console.log(`  Cleared the valuation lists from ${modifiedCount} stats document(s).`);
    }
}
