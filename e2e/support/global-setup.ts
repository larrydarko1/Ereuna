import { MongoClient } from 'mongodb';
import { createRedis, clearRateLimitBuckets } from './rate-limit';

export default async function globalSetup(): Promise<void> {
    const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017';
    const dbName = process.env.MONGO_DB ?? 'ereuna_e2e';

    if (!/e2e|test/i.test(dbName)) {
        throw new Error(
            `Refusing to drop database "${dbName}" — the E2E name must contain "e2e" or "test". ` +
                `Check MONGO_DB in e2e/.env.e2e.`,
        );
    }

    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    try {
        await client.connect();
        await client.db(dbName).dropDatabase();
        console.log(`[e2e] cleared test database "${dbName}"`);
    } catch (err) {
        throw new Error(
            `[e2e] Could not reach MongoDB at ${uri}. Start it first ` + `(brew services start mongodb-community).`,
            { cause: err },
        );
    } finally {
        await client.close();
    }

    await resetRateLimits();
}

async function resetRateLimits(): Promise<void> {
    const redis = createRedis();
    try {
        await redis.connect();
        const cleared = await clearRateLimitBuckets(redis);
        console.log(`[e2e] cleared ${cleared} rate-limit bucket(s)`);
    } catch (err) {
        console.warn('[e2e] could not clear rate-limit buckets (continuing):', err);
    } finally {
        redis.disconnect();
    }
}
