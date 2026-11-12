/** What a database holds, in the form a backup's manifest records and a restore checks against. */
import { type Db, MongoClient } from 'mongodb';

export type Counts = { collections: Record<string, number>; timeSeriesBuckets: Record<string, number> };

/**
 * Documents per collection, and buckets per time series collection.
 * Counting the bars themselves unpacks every bucket — minutes over half a
 * billion of them — while the bucket count is a metadata read and is restored
 * exactly, so it proves the same thing. MongoDB 9.0 refuses direct reads of the
 * `system.buckets.*` namespace; `rawData` is how a command now reads
 * a time series collection's buckets instead of its bars.
 */
export async function collectionCounts(mongoUri: string, mongoDb: string): Promise<Counts> {
    const client = new MongoClient(mongoUri);
    try {
        await client.connect();
        const db = client.db(mongoDb);
        const listed = (await db.listCollections().toArray()).filter(({ name }) => !name.startsWith('system.'));

        const counts = await Promise.all(
            listed.map(async ({ name, type }) =>
                type === 'timeseries'
                    ? ([name, await countBuckets(db, name), true] as const)
                    : ([name, await db.collection(name).countDocuments(), false] as const),
            ),
        );
        return {
            collections: Object.fromEntries(counts.filter(([, , series]) => !series).map(([name, n]) => [name, n])),
            timeSeriesBuckets: Object.fromEntries(counts.filter(([, , series]) => series).map(([name, n]) => [name, n])),
        };
    } finally {
        await client.close();
    }
}

async function countBuckets(db: Db, name: string): Promise<number> {
    const answer = await db.command({ count: name, rawData: true });
    const counted: unknown = answer['n'];
    if (typeof counted !== 'number') throw new Error(`count on ${name} answered without a number`);
    return counted;
}
