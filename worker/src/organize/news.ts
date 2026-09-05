/** Headlines. */
import type { AnyBulkWriteOperation } from 'mongodb';
import type { NewsDoc } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { news, type VendorNewsItem } from '@/lib/tiingo.js';
import { chunk, type Asset } from '@/organize/universe.js';

/** Symbols per request. More than this and the query string stops being accepted. */
const SYMBOLS_PER_REQUEST = 50;

/** Headlines requested per batch. */
const ARTICLES_PER_REQUEST = 100;

/** The asset classes headlines are fetched for. */
const COVERED = ['Stock', 'ETF', 'Crypto'];

export async function updateNews(universe: readonly Asset[]): Promise<number> {
    const symbols = universe.filter((asset) => COVERED.includes(asset.assetType)).map((asset) => asset.symbol);
    const operations = new Map<string, AnyBulkWriteOperation<NewsDoc>>();

    for (const batch of chunk(symbols, SYMBOLS_PER_REQUEST)) {
        try {
            collect(await news(batch, ARTICLES_PER_REQUEST), operations);
        } catch (err) {
            logger.debug({ err, symbols: batch.length }, 'News batch failed');
        }
    }

    await write([...operations.values()]);
    logger.info({ articles: operations.size }, 'News updated');
    return operations.size;
}

/**
 * One vendor headline as a stored article, or null when it is unusable.
 *
 * The vendor's field is `description`; the read path serves `summary`. The
 * Python stored the vendor's name verbatim, so every headline the API has ever
 * returned carried a null summary.
 */
function toArticle(item: VendorNewsItem): NewsDoc | null {
    if (item.url === undefined || item.url === '' || item.title === undefined) return null;

    const publishedDate = item.publishedDate === undefined ? null : new Date(item.publishedDate);
    if (publishedDate === null || Number.isNaN(publishedDate.getTime())) return null;

    return {
        title: item.title,
        url: item.url,
        publishedDate,
        tickers: (item.tickers ?? []).map((ticker) => ticker.toUpperCase()),
        ...(item.source === undefined ? {} : { source: item.source }),
        ...(item.description === undefined || item.description === '' ? {} : { summary: item.description }),
    };
}

function upsert(article: NewsDoc): AnyBulkWriteOperation<NewsDoc> {
    return { updateOne: { filter: { url: article.url }, update: { $set: article }, upsert: true } };
}

/**
 * Fold one vendor batch into the pending upserts.
 * Keyed by URL so the run de-duplicates before it writes, rather than
 * discovering the collision at the server.
 */
function collect(items: readonly VendorNewsItem[], into: Map<string, AnyBulkWriteOperation<NewsDoc>>): void {
    for (const item of items) {
        const article = toArticle(item);
        if (article !== null) into.set(article.url, upsert(article));
    }
}

async function write(operations: readonly AnyBulkWriteOperation<NewsDoc>[]): Promise<void> {
    if (operations.length === 0) return;

    for (const batch of chunk(operations, 500)) {
        try {
            // eslint-disable-next-line contracts/no-db-await-in-loop -- one round trip per batch of operations, not per item, and sequential so a whole universe does not swamp the pool
            await getDb().collection<NewsDoc>('News').bulkWrite(batch, { ordered: false });
        } catch (err) {
            logger.error({ err, count: batch.length }, 'News bulk write failed');
        }
    }
}
