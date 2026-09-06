import { MongoClient, ObjectId } from 'mongodb';

export type SeededAsset = {
    symbol: string;
    name: string;
};

const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB ?? 'ereuna_e2e';

/**
 * One asset in the reference collection the screener queries and the chart
 * profiles. The symbol is unique per call, so specs never collide on it.
 */
export async function seedAsset(overrides: Record<string, unknown> = {}): Promise<SeededAsset> {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    try {
        await client.connect();

        const doc = {
            Symbol: `E2E${new ObjectId().toHexString().slice(-6).toUpperCase()}`,
            Name: 'Seeded E2E Industries',
            AssetType: 'Stock',
            Sector: 'Technology',
            Industry: 'Software',
            Exchange: 'NASDAQ',
            Country: 'USA',
            Currency: 'USD',
            Delisted: false,
            MarketCapitalization: 1_000_000_000,
            IntrinsicValue: 120,
            dividends: [],
            splits: [],
            ...overrides,
        };

        await client.db(dbName).collection('AssetInfo').insertOne(doc);

        return { symbol: doc.Symbol, name: doc.Name };
    } finally {
        await client.close();
    }
}

/**
 * `count` ascending daily bars ending yesterday, in the collection the daily
 * timeframe reads. In production that namespace is a MongoDB time series
 * collection; a dropped E2E database has no such namespace, so the insert
 * creates an ordinary one — which reads identically and is all the chart needs.
 */
export async function seedDailyCandles(symbol: string, count: number): Promise<void> {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    try {
        await client.connect();

        const day = 24 * 60 * 60 * 1000;
        const end = Date.now() - day;

        await client
            .db(dbName)
            .collection('OHCLVData')
            .insertMany(
                Array.from({ length: count }, (_, i) => {
                    const close = 100 + Math.sin(i / 5) * 10;
                    return {
                        tickerID: symbol,
                        timestamp: new Date(end - (count - 1 - i) * day),
                        open: close - 1,
                        high: close + 2,
                        low: close - 2,
                        close,
                        volume: 1_000_000 + i * 1000,
                    };
                }),
            );
    } finally {
        await client.close();
    }
}
