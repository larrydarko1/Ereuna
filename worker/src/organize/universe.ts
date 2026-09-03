/**
 * The set of instruments the nightly run operates on, and the reference fields
 * every job needs about them.
 */
import type { AssetInfoDoc } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';

/** The exchanges treated as the primary US market throughout the statistics. */
export const PRIMARY_EXCHANGES = ['NYSE', 'NASDAQ'] as const;

export type Asset = {
    symbol: string;
    assetType: string;
    exchange: string;
    sector: string;
    industry: string;
    marketCap: number | null;
    sharesOutstanding: number | null;
    ipo: Date | null;
};

/** Every symbol not marked delisted, with the reference fields the run reads. */
export async function activeUniverse(): Promise<Asset[]> {
    const docs = await getDb()
        .collection<AssetInfoDoc>('AssetInfo')
        .find(
            { Delisted: { $ne: true } },
            {
                projection: {
                    _id: 0,
                    Symbol: 1,
                    AssetType: 1,
                    Exchange: 1,
                    Sector: 1,
                    Industry: 1,
                    MarketCapitalization: 1,
                    SharesOutstanding: 1,
                    IPO: 1,
                },
            },
        )
        .toArray();

    return docs.map(toAsset);
}

/** Split a list into fixed-size chunks, so a job can bound what it holds at once. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
    return chunks;
}

function toAsset(doc: AssetInfoDoc): Asset {
    const ipo = doc.IPO;

    return {
        symbol: doc.Symbol,
        assetType: typeof doc.AssetType === 'string' ? doc.AssetType : '',
        exchange: typeof doc.Exchange === 'string' ? doc.Exchange : '',
        sector: typeof doc.Sector === 'string' ? doc.Sector : '',
        industry: typeof doc.Industry === 'string' ? doc.Industry : '',
        marketCap: typeof doc.MarketCapitalization === 'number' ? doc.MarketCapitalization : null,
        sharesOutstanding: typeof doc.SharesOutstanding === 'number' ? doc.SharesOutstanding : null,
        ipo: ipo instanceof Date && !Number.isNaN(ipo.getTime()) ? ipo : null,
    };
}
