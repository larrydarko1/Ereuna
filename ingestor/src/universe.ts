/**
 * The symbols the ingestor subscribes to: every listed NASDAQ and NYSE asset.
 * Read fresh at the start of each session rather than held for the life of the
 * process, so an overnight IPO or delisting is picked up by the next market
 * open without a restart.
 */
import type { AssetInfoDoc } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';

const EXCHANGES = ['NASDAQ', 'NYSE'];

export async function loadUniverse(): Promise<string[]> {
    const documents = await getDb()
        .collection<AssetInfoDoc>('AssetInfo')
        .find({ Delisted: false, Exchange: { $in: EXCHANGES } }, { projection: { Symbol: 1, _id: 0 } })
        .toArray();

    const symbols = documents
        .map((document) => document.Symbol?.toUpperCase())
        .filter((symbol): symbol is string => symbol !== undefined && symbol !== '');

    return [...new Set(symbols)];
}
