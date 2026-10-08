/** What a database holds, in the form a backup's manifest records and a restore checks against. */
import { MongoClient } from 'mongodb';

export type Counts = { collections: Record<string, number>; timeSeriesBuckets: Record<string, number> };

/**
 * Documents per collection, and buckets per time series collection.
 * Counting the bars themselves unpacks every bucket — minutes over half a
 * billion of them — while the bucket count is a metadata read and is restored
 * exactly, so it proves the same thing.
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
                    ? ([name, await db.collection(`system.buckets.${name}`).estimatedDocumentCount(), true] as const)
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
