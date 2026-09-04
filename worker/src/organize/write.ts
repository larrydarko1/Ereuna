/** Bulk writes to `AssetInfo`, which is what most of the nightly jobs produce. */
import type { AnyBulkWriteOperation, Collection } from 'mongodb';
import type { AssetInfoDoc, CorporateAction } from '@ereuna/shared';
import { config } from '@/lib/config.js';
import { getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { chunk } from '@/organize/universe.js';

/**
 * The fields the corporate-action writes address, without the index signature.
 * `AssetInfoDoc` ends in `[field: string]: unknown` for the derived fields no
 * reader has typed yet, and the driver's update operators cannot be resolved
 * against that: `NotAcceptedFields` maps every key to `undefined`, so `$push`
 * and `$mul` are rejected even on the arrays the type does declare. Naming the
 * handful of fields those operators touch keeps them checked.
 */
type AssetInfoWrite = {
    Symbol: string;
    dividends: CorporateAction[];
    splits: CorporateAction[];
    SharesOutstanding: number;
    DividendDate: Date;
};

export async function writeAssetInfo(operations: readonly AnyBulkWriteOperation<AssetInfoDoc>[]): Promise<void> {
    if (operations.length === 0) return;
    const collection = getDb().collection<AssetInfoDoc>('AssetInfo');

    for (const batch of chunk(operations, config.organize.writeBatchSize)) {
        try {
            await collection.bulkWrite(batch, { ordered: false });
        } catch (err) {
            logger.error({ err, count: batch.length }, 'AssetInfo bulk write failed');
        }
    }
}

/** An `updateOne` that sets `fields` on one symbol. The shape every job needs. */
export function setOn(symbol: string, fields: Record<string, unknown>): AnyBulkWriteOperation<AssetInfoDoc> {
    return { updateOne: { filter: { Symbol: symbol }, update: { $set: fields } } };
}

export function assetInfoUpdates(): Collection<AssetInfoWrite> {
    return getDb().collection<AssetInfoWrite>('AssetInfo');
}
