/**
 * market-overview — the ingestor's singleton documents and the reference index.
 * Everything here is written by the Python ingestor and only read by the API,
 * so all of it is cached hard.
 * The market summary is translated into the MarketOverview contract before it
 * leaves (utils/market-overview.ts) rather than passed through. Passing the
 * raw document through only moved the ingestor's vocabulary into the browser,
 * where a renamed field showed up as a blank panel instead of a failing test.
 * The holiday document is still passed through: it is one array of dates with
 * nothing to model.
 */
import type { MarketOverview, StatsDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { marketKey, withCache } from '@/lib/cache.js';
import { getDb } from '@/lib/db.js';
import { requireAsset } from '@/services/market/market-assets.js';
import { toMarketOverview } from '@/utils/market-overview.js';

export type Financials = {
    symbol: string;
    annual: Record<string, unknown>[];
    quarterly: Record<string, unknown>[];
};

/** One day. Holidays change on the ingestor's schedule, not ours. */
const DAY_SECONDS = 86_400;

/**
 * The market summary the dashboard opens with, including when it was last
 * ingested — which is why there is no separate "last update" endpoint: the
 * timestamp belongs to the document it describes.
 */
export async function marketStats(): Promise<MarketOverview> {
    return toMarketOverview(await statsDocument('marketStats'));
}

export async function holidays(): Promise<StatsDoc> {
    return statsDocument('Holidays');
}

/**
 * Annual and quarterly financial statements for one symbol.
 * A symbol with no statements returns empty lists rather than a 404: the asset
 * exists, the ingestor simply has not covered it, and those are different
 * answers to the caller.
 */
export async function financials(symbol: string): Promise<Financials> {
    const asset = await requireAsset(symbol);
    return {
        symbol,
        annual: asset.AnnualFinancials ?? [],
        quarterly: asset.quarterlyFinancials ?? [],
    };
}

async function statsDocument(id: string): Promise<StatsDoc> {
    const doc = await withCache(
        marketKey('stats', id),
        async () => getDb().collection<StatsDoc>('Stats').findOne({ _id: id }),
        { ttl: id === 'Holidays' ? DAY_SECONDS : undefined, dataType: id === 'Holidays' ? 'static' : 'price' },
    );

    if (doc === null) throw new AppError(404, 'NOT_FOUND', `Stats document ${id} has not been ingested`);
    return doc;
}
