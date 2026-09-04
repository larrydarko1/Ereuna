/**
 * market-news — headline reads from the ingested `News` collection.
 * One query serves both the dashboard's index panel and a symbol's news feed:
 * they differ only in which symbols they name and how far back they look, so
 * they are the same read with different arguments rather than two endpoints
 * drifting apart.
 */
import type { NewsDoc } from '@ereuna/shared';
import { createHash } from 'node:crypto';
import type { Filter } from 'mongodb';
import { marketKey, withCache } from '@/lib/cache.js';
import { getDb } from '@/lib/db.js';

export type NewsRow = {
    title: string;
    url: string;
    source: string | null;
    summary: string | null;
    imageUrl: string | null;
    tickers: string[];
    publishedDate: string; // ISO 8601. A string, not a Date: headlines round-trip through the JSON cache
};

export type NewsQuery = {
    symbols?: readonly string[];
    since?: Date;
    limit: number;
};

const MAX_HEADLINES = 100;

export async function news(query: NewsQuery): Promise<NewsRow[]> {
    const limit = Math.min(query.limit, MAX_HEADLINES);
    const symbols = [...(query.symbols ?? [])].sort();

    const filter: Filter<NewsDoc> = {
        ...(symbols.length > 0 ? { tickers: { $in: symbols } } : {}),
        ...(query.since !== undefined ? { publishedDate: { $gte: query.since } } : {}),
    };

    // The symbol list is hashed rather than joined into the key: a dashboard
    // asking for thirty tickers would otherwise build a key longer than the
    // value, and two callers naming the same set now share one entry.
    const scope =
        symbols.length === 0 ? 'all' : createHash('sha256').update(symbols.join(',')).digest('hex').slice(0, 16);
    const since = query.since === undefined ? 'any' : query.since.toISOString().slice(0, 10);

    return withCache(
        marketKey('news', scope, since, String(limit)),
        async () => {
            const docs = await getDb()
                .collection<NewsDoc>('News')
                .find(filter)
                .sort({ publishedDate: -1 })
                .limit(limit)
                .toArray();

            return docs.map(toRow);
        },
        { dataType: 'price' },
    );
}

function toRow(doc: NewsDoc): NewsRow {
    return {
        title: doc.title,
        url: doc.url,
        source: doc.source ?? null,
        summary: doc.summary ?? null,
        imageUrl: doc.imageUrl ?? null,
        tickers: doc.tickers,
        publishedDate: new Date(doc.publishedDate).toISOString(),
    };
}
